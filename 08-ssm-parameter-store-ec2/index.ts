import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as fs from "node:fs";

// pulumi config set ssmParameterValue HELLO_WORLD_THIS_IS_A_SECRET --secret
// Retrieve the configuration values
const config = new pulumi.Config();
const ssmParameterValue = config.requireSecret("ssmParameterValue");

// Create a new AWS Systems Manager Parameter Store parameter
const parameter = new aws.ssm.Parameter("MySecureParameter", {
  name: "MySecureParameter",
  type: "SecureString",
  value: ssmParameterValue,
});

// Create a new IAM role for the EC2 instance
const role = new aws.iam.Role("ec2Role", {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Principal: {
          Service: "ec2.amazonaws.com",
        },
        Effect: "Allow",
      },
    ],
  },
});

// Attach the SSM managed policy to the role
const policyAttachment = new aws.iam.RolePolicyAttachment(
  "ssmPolicyAttachment",
  {
    role: role.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  }
);

// Create an instance profile for the EC2 instance
const instanceProfile = new aws.iam.InstanceProfile("instanceProfile", {
  role: role.name,
});

// Create a new key pair
const keyName = config.require("keyName");
const publicKey = config.require("publicKey");

const key = new aws.ec2.KeyPair(keyName, { publicKey });

// Create a new security group for port 22
const secgroup = new aws.ec2.SecurityGroup("secgroup", {
  ingress: [
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
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
  iamInstanceProfile: instanceProfile.name,
  ami: "ami-06c68f701d8090592", // Ubuntu Server 24.04 LTS (HVM)
  keyName: key.keyName,
  userData: Buffer.from(userData).toString("base64"),
});

// Export the name of the instance and the public IP
export const instanceName = server.id;
export const publicIp = server.publicIp;
