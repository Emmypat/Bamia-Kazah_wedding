##############################################################
# outputs.tf
#
# Values printed after `terraform apply` completes.
# These are the URLs and IDs you'll need to configure your
# frontend and test the platform.
##############################################################

output "cloudfront_url" {
  description = "Main URL for the wedding photo platform. Share this with guests."
  value       = "https://${module.cdn.cloudfront_domain_name}"
}

output "api_url" {
  description = "API Gateway base URL. Used by the frontend to make API calls."
  value       = module.api.api_url
}

output "photos_bucket_name" {
  description = "S3 bucket where guest photos are stored."
  value       = module.storage.photos_upload_bucket_name
}

output "frontend_bucket_name" {
  description = "S3 bucket for frontend static files. Deploy your React build here."
  value       = module.storage.frontend_bucket_name
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID. Needed for frontend Amplify configuration."
  value       = module.auth.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Cognito App Client ID. Needed for frontend Amplify configuration."
  value       = module.auth.user_pool_client_id
}

output "rekognition_collection_id" {
  description = "Rekognition face collection ID."
  value       = var.rekognition_collection_id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID. Needed to invalidate cache after frontend deploy."
  value       = module.cdn.cloudfront_distribution_id
}

output "next_steps" {
  description = "What to do after terraform apply."
  value       = <<-EOT

    ✅ Infrastructure deployed! Next steps:

    1. Verify SES email:
       Go to AWS Console → SES → Verified identities
       Verify: ${var.notification_email_from}

    2. Build & deploy frontend:
       cd ../frontend
       npm install && npm run build
       aws s3 sync build/ s3://${module.storage.frontend_bucket_name}
       aws cloudfront create-invalidation --distribution-id ${module.cdn.cloudfront_distribution_id} --paths "/*"

    3. Create admin user in Cognito:
       aws cognito-idp admin-create-user \
         --user-pool-id ${module.auth.user_pool_id} \
         --username admin@yourwedding.com \
         --user-attributes Name=email,Value=admin@yourwedding.com

    4. Register the couple's faces:
       POST ${module.api.api_url}/register-couple
       (See docs/DEPLOYMENT.md for full instructions)

    5. Share with guests:
       🎉 ${("https://${module.cdn.cloudfront_domain_name}")}

  EOT
}
