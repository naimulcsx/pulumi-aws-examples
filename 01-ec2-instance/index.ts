import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Get the config
const config = new pulumi.Config();

// Create a new key pair
const keyName = config.require("keyName");
const publicKey = config.require("publicKey");

const key = new aws.ec2.KeyPair(keyName, { publicKey });

// Create a new security group for port 22
const secgroup = new aws.ec2.SecurityGroup("secgroup", {
  ingress: [
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
  ],
});

// Create an EC2 instance and use the newly created key pair
const server = new aws.ec2.Instance("server", {
  instanceType: "t2.micro",
  securityGroups: [secgroup.name],
  ami: "ami-04b70fa74e45c3917", // Ubuntu Server 24.04 LTS (HVM)
  keyName: key.keyName,
});

// Export the name of the instance and the public IP
export const instanceName = server.id;
export const publicIp = server.publicIp;
