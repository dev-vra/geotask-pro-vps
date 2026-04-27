variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name (used as prefix for all resources)"
  type        = string
  default     = "geotask"
}

variable "root_domain" {
  description = "Root domain — must already have a hosted zone in Route 53"
  type        = string
  default     = "geogis.com.br"
}

variable "subdomain" {
  description = "Subdomain for the application"
  type        = string
  default     = "geotask"
}

variable "ec2_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "ec2_key_pair_name" {
  description = "Name of an existing EC2 Key Pair for SSH access"
  type        = string
  # Create in AWS Console → EC2 → Key Pairs, then set here or in terraform.tfvars
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "geotask"
}

variable "db_password" {
  description = "RDS master password (min 8 chars)"
  type        = string
  sensitive   = true
  # Set in terraform.tfvars or via TF_VAR_db_password env var — never hardcode
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GB"
  type        = number
  default     = 20
}

variable "s3_bucket_name" {
  description = "S3 bucket name for file uploads (must be globally unique)"
  type        = string
  default     = "geotask-attachments"
}
