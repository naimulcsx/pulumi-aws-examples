import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Create a repository for container images.
const repo = new awsx.ecr.Repository("my-express-app", {
  forceDelete: true,
});

// Build and publish a Docker image to a private ECR registry.
const img = new awsx.ecr.Image("app-img", {
  repositoryUrl: repo.url,
  context: "./app",
  // Remove the following 2 lines if you are using Apple M-series chips
  builderVersion: awsx.ecr.BuilderVersion.BuilderV1,
  platform: "linux/amd64",
});

// Create a VPC
const vpc = new aws.ec2.Vpc("vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsSupport: true,
  enableDnsHostnames: true,
});

// Create an Internet Gateway
const ig = new aws.ec2.InternetGateway("ig", { vpcId: vpc.id });

// Create a subnet
const subnet = new aws.ec2.Subnet("subnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  mapPublicIpOnLaunch: true,
});

// Create a route table for the public subnet
const routeTable = new aws.ec2.RouteTable("myRouteTable", {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      gatewayId: ig.id,
    },
  ],
  tags: {
    Name: "my-route-table",
  },
});

// Associate the route table with the public subnet
const routeTableAssociation = new aws.ec2.RouteTableAssociation(
  "myRouteTableAssociation",
  {
    subnetId: subnet.id,
    routeTableId: routeTable.id,
  }
);

// Create the IAM Role for ECS Task Execution
const ecsTaskExecutionRole = new aws.iam.Role("ecsTaskExecutionRole", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Principal: {
          Service: "ecs-tasks.amazonaws.com",
        },
        Effect: "Allow",
        Sid: "",
      },
    ],
  }),
});

// Attach the Amazon ECS Task Execution Role policy to the role
const taskExecRolePolicyAttachment = new aws.iam.RolePolicyAttachment(
  "taskExecRolePolicyAttachment",
  {
    role: ecsTaskExecutionRole.name,
    policyArn:
      "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
  }
);

// Create an ECS cluster
const cluster = new aws.ecs.Cluster("cluster");

// Create a CloudWatch log group
const logGroup = new aws.cloudwatch.LogGroup("ecs-logs", {
  name: "ecs-logs",
});

// Define an ECS task
const taskDefinition = new aws.ecs.TaskDefinition("app-task", {
  family: "my-app",
  cpu: "1024",
  memory: "2048",
  // https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/networking-networkmode.html
  networkMode: "awsvpc",
  requiresCompatibilities: ["FARGATE"],
  executionRoleArn: ecsTaskExecutionRole.arn,
  containerDefinitions: pulumi
    .output([
      {
        name: "my-app",
        image: img.imageUri,
        portMappings: [
          {
            containerPort: 80,
            hostPort: 80,
            protocol: "tcp",
          },
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": logGroup.name,
            "awslogs-region": aws.config.requireRegion(),
            "awslogs-stream-prefix": "my-app",
          },
        },
      },
    ])
    .apply(JSON.stringify),
});

// Security Group
const securityGroup = new aws.ec2.SecurityGroup("appSecurityGroup", {
  vpcId: vpc.id,
  description: "Allow HTTP",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
});

// Create a service
const service = new aws.ecs.Service("app-service", {
  cluster: cluster.id,
  desiredCount: 3,
  launchType: "FARGATE",
  taskDefinition: taskDefinition.arn,
  networkConfiguration: {
    assignPublicIp: true,
    subnets: [subnet.id],
    securityGroups: [securityGroup.id],
  },
});

// Export the cluster name
export const repoUrl = repo.url;
export const clusterName = cluster.name;
