output "ec2_public_ip" {
  description = "EC2 Elastic IP — use this in GitHub Secrets as EC2_HOST"
  value       = aws_eip.app.public_ip
}

output "ec2_ssh_command" {
  description = "SSH command to connect to the server"
  value       = "ssh -i YOUR_KEY.pem ubuntu@${aws_eip.app.public_ip}"
}

output "app_url" {
  description = "Application URL"
  value       = "https://${var.subdomain}.${var.root_domain}"
}

output "rds_endpoint" {
  description = "RDS endpoint — use in DATABASE_URL (without port)"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "database_url" {
  description = "Full DATABASE_URL string — copy to GitHub Secrets"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/geotask?sslmode=require"
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket name — use as AWS_S3_BUCKET"
  value       = aws_s3_bucket.attachments.bucket
}

output "s3_access_key_id" {
  description = "IAM access key ID — use as AWS_ACCESS_KEY_ID"
  value       = aws_iam_access_key.app_s3.id
  sensitive   = true
}

output "s3_secret_access_key" {
  description = "IAM secret access key — use as AWS_SECRET_ACCESS_KEY"
  value       = aws_iam_access_key.app_s3.secret
  sensitive   = true
}
