variable "name_prefix" {
  description = "Resource name prefix (project-environment)"
  type        = string
}

variable "suffix" {
  description = "Random suffix for globally unique S3 bucket names"
  type        = string
}

variable "photo_retention_days" {
  description = "Days before S3 lifecycle rule deletes uploaded photos (0 = never)"
  type        = number
  default     = 90
}

variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution allowed to read the frontend bucket"
  type        = string
  default     = "" # Set by cdn module after creation
}
