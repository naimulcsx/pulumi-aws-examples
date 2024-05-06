import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

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
        image: "nginx",
        portMappings: [
          {
            containerPort: 80,
            hostPort: 80,
            protocol: "tcp",
          },
        ],
      },
    ])
    .apply(JSON.stringify),
});

// Security Group
const securityGroup = new aws.ec2.SecurityGroup("nginxSecurityGroup", {
  vpcId: vpc.id,
  description: "Allow HTTP and HTTPS",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      protocol: "tcp",
      fromPort: 443,
      toPort: 443,
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
export const clusterName = cluster.name;
