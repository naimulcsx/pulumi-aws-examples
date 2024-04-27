import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as fs from "fs";

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
  securityGroups: [secgroup.name],
  ami: "ami-04b70fa74e45c3917", // Ubuntu Server 24.04 LTS (HVM)
  keyName: key.keyName,
  userData: Buffer.from(userData).toString("base64"),
});

// Export the name of the instance and the public IP
export const instanceName = server.id;
export const publicIp = server.publicIp;
