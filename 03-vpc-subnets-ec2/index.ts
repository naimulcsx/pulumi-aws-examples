import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as fs from "fs";

// Create a new VPC
const vpc = new aws.ec2.Vpc("myVpc", {
  cidrBlock: "10.0.0.0/16",
  tags: {
    Name: "my-vpc",
  },
});

// Create an Internet Gateway
const igw = new aws.ec2.InternetGateway("myInternetGateway", {
  // vpcId: vpc.id,
  tags: {
    Name: "my-internet-gateway",
  },
});

// Attach the Internet Gateway to the VPC
const igwAttachment = new aws.ec2.InternetGatewayAttachment("myIgwAttachment", {
  vpcId: vpc.id,
  internetGatewayId: igw.id,
});

// Create a public subnet within the VPC
const publicSubnet = new aws.ec2.Subnet("myPublicSubnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  mapPublicIpOnLaunch: true,
  tags: {
    Name: "my-public-subnet",
  },
});

// Create a route table for the public subnet
const routeTable = new aws.ec2.RouteTable("myRouteTable", {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      gatewayId: igw.id,
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
    subnetId: publicSubnet.id,
    routeTableId: routeTable.id,
  }
);

// Get the config
const config = new pulumi.Config();

// Create a new key pair
const keyName = config.require("keyName");
const publicKey = config.require("publicKey");

const key = new aws.ec2.KeyPair(keyName, { publicKey });

// Create a new security group for port 22
const secgroup = new aws.ec2.SecurityGroup("secgroup", {
  vpcId: vpc.id,
  ingress: [
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
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

// Create an EC2 instance and use the newly created key pair
let userData = fs.readFileSync("install_nginx.sh", "utf-8");

const server = new aws.ec2.Instance("server", {
  instanceType: "t2.micro",
  vpcSecurityGroupIds: [secgroup.id],
  subnetId: publicSubnet.id,
  ami: "ami-04b70fa74e45c3917", // Ubuntu Server 24.04 LTS (HVM)
  keyName: key.keyName,
  userData: Buffer.from(userData).toString("base64"),
});

// Export the VPC, IGW, and Subnet IDs
export const vpcId = vpc.id;
export const igwId = igw.id;
export const subnetId = publicSubnet.id;
export const instanceName = server.id;
export const publicIp = server.publicIp;
