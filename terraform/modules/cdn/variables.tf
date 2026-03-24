variable "name_prefix" { type = string }
variable "frontend_bucket_domain_name" { type = string }
variable "frontend_bucket_id" { type = string }
variable "api_gateway_url" { type = string }
variable "domain_name" {
  type    = string
  default = ""
}
variable "certificate_arn" {
  type    = string
  default = ""
}
