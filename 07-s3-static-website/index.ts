import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as fs from "fs";
import * as path from "path";
import * as mime from "mime";

// Create an AWS resource (S3 Bucket)
const siteBucket = new aws.s3.Bucket("my-bucket", {
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
    blockPublicPolicy: false, // If this is true, bucket policy can not be created, will return a 403 error
    restrictPublicBuckets: false, // This is an extra layer to restrict public bucket policy that we'll create
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

const bucketPolicy = new aws.s3.BucketPolicy(
  "bucketPolicy",
  {
    bucket: siteBucket.bucket, // depends on siteBucket -- see explanation below
    policy: policy.apply((policy) => policy.json),
  },
  { dependsOn: [blockPublicAccess] } // Prevents policy creation from failing
);

// crawlDirectory recursive crawls the provided directory, applying the provided function
// to every file it contains. Doesn't handle cycles from symlinks.
function crawlDirectory(dir: string, f: (_: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = `${dir}/${file}`;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      crawlDirectory(filePath, f);
    }
    if (stat.isFile()) {
      f(filePath);
    }
  }
}

const webContentsRootPath = path.join(process.cwd(), "www");
console.log("Syncing contents from local disk at", webContentsRootPath);
crawlDirectory(webContentsRootPath, (filePath: string) => {
  const relativeFilePath = filePath.replace(webContentsRootPath + "/", "");
  const contentFile = new aws.s3.BucketObject(relativeFilePath, {
    key: relativeFilePath,
    bucket: siteBucket,
    contentType: mime.getType(filePath) || undefined,
    source: new pulumi.asset.FileAsset(filePath),
  });
});

// Export the name of the bucket
export const bucketName = siteBucket.id;
export const bucketRegionalDomainName = siteBucket.bucketRegionalDomainName; // output the endpoint as a stack output
export const websiteUrl = siteBucket.websiteEndpoint; // output the endpoint as a stack output
