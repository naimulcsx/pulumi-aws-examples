## Resources

- **Key Pair**: A key pair is required for SSH access to the EC2 instance.
- **Security Group**: This controls the inbound and outbound traffic for the EC2 instance.
- **EC2 Instance**: The virtual server that will be created on AWS.

## Prerequisites

Before you begin, make sure you have the following:

- [AWS CLI](https://aws.amazon.com/cli/) installed and configured with valid security credentials.
- [Pulumi](https://www.pulumi.com/docs/get-started/aws/install-pulumi/) installed and configured.

### Steps

1. Install dependencies:

    ```bash
    npm install
    ```

2. Generate a key pair:

    ```bash
    npm run keygen
    ```

3. Create a Stack:

After initializing Pulumi, you need to create a new stack to manage your AWS resources. You can create a stack using the following command:

```bash
pulumi stack init <stack-name>
```

4. Set the key name for AWS login:

    ```bash
    pulumi config set keyName aws_login
    ```

5. Set the public key for SSH access:

    ```bash
    cat ./keys/rsa.pub | pulumi config set publicKey 
    ```

6. Deploy the infrastructure:

    ```bash
    pulumi up
    ```

Follow the prompts during the deployment process. Once completed, you will have successfully provisioned an EC2 instance on AWS.

### Validation

To validate the setup, SSH into the EC2 instance using the generated key:

```bash
ssh -i keys/rsa ubuntu@{EC2_PUBLIC_IP}
```

Replace `{EC2_PUBLIC_IP}` with the public IP address of your EC2 instance.

### Cleanup

To destroy the infrastructure and clean up resources:

```bash
pulumi destroy
```

Follow the prompts to confirm the destruction of resources.

For more information on managing AWS resources with Pulumi, refer to the [Pulumi documentation](https://www.pulumi.com/docs/).
