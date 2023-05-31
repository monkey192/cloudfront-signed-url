import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as api from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import path = require("path");
import * as fs from 'fs';

export class AwsInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Image bucket - used to storage images which user upload/ download
    const bucketname1 = `${this.node.getContext(
      "prefix"
    )}-images-${this.node.getContext("env")}`;
    const s3BucketImage = new s3.Bucket(this, "s3-image", {
      bucketName: bucketname1,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // S3 Bucket - used to storage key pem
    const bucketname2 = `${this.node.getContext(
      "prefix"
    )}-backend-setting-${this.node.getContext("env")}`;
    const s3BucketKeyPem = new s3.Bucket(this, "s3-keypem", {
      bucketName: bucketname2,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // *************************************
    const lambdaPolicyJson = fs.readFileSync(
      path.join(__dirname, "assest", "lambda-execute-policy.json"),
      "utf-8"
    );
    const lambdaPolicy = iam.PolicyDocument.fromJson(
      JSON.parse(lambdaPolicyJson)
    );

    const lambdaExecutionRole = new iam.Role(this, "LambdaExecutionRole", {
      roleName: "LambdaExecutionRole",
      managedPolicies: [
        {
          managedPolicyArn:
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        },
      ],
      inlinePolicies: { LambdaExecutionPolicy: lambdaPolicy },
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    // Create lambda function - Signed URL
    const fnSignedURLnew = new lambda.Function(this, "fn-signed-url", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "signed-url.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "resources", "lambda")),
      role: lambdaExecutionRole,
    });

    // ************************************* API Gateway
    const apigateway = new api.RestApi(this, "signed-url", {
      restApiName: "signed-url",
      deployOptions: {
        stageName: "api",
      },
    });
    apigateway.root.addMethod("ANY", new api.LambdaIntegration(fnSignedURLnew));
  }
}
