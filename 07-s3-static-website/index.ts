import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create an AWS resource (S3 Bucket)
const siteBucket = new aws.s3.Bucket("my-bucket", {
  acl: aws.s3.CannedAcl.PublicRead,
  website: {
    indexDocument: "index.html",
  },
});

// Enable Public Access settings for the bucket
const blockPublicAccess = new aws.s3.BucketPublicAccessBlock(
  "blockPublicAccess",
  {
    bucket: siteBucket.id,
    blockPublicAcls: true,
    ignorePublicAcls: true,
    blockPublicPolicy: true,
    restrictPublicBuckets: false,
  }
);

// Create an S3 Bucket Policy to allow public read of all objects in bucket
// This reusable function can be pulled out into its own module
const policy = aws.iam.getPolicyDocumentOutput({
  statements: [
    {
      sid: "PublicReadGetObject",
      effect: "Allow",
      principals: [
        {
          type: "AWS",
          identifiers: ["*"],
        },
      ],
      actions: ["s3:GetObject"],
      resources: [pulumi.interpolate`${siteBucket.arn}/*`],
    },
  ],
});

const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
  bucket: siteBucket.bucket, // depends on siteBucket -- see explanation below
  policy: policy.apply((policy) => policy.json),
});

// Upload files to the S3 bucket
const indexHtml = new aws.s3.BucketObject("index.html", {
  bucket: siteBucket,
  source: new pulumi.asset.FileAsset("./website/index.html"),
  contentType: "text/html",
});
const stylesCss = new aws.s3.BucketObject("styles.css", {
  bucket: siteBucket,
  source: new pulumi.asset.FileAsset("./website/styles.css"),
  contentType: "text/css",
});

// Export the name of the bucket
export const bucketName = siteBucket.id;
export const websiteUrl = siteBucket.websiteEndpoint; // output the endpoint as a stack output
