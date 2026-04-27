# ---------------------------------------------------------------------------
# S3 Bucket — file uploads
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "attachments" {
  bucket = var.s3_bucket_name

  tags = {
    Name = "${var.app_name}-attachments"
  }
}

resource "aws_s3_bucket_public_access_block" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle: move old files to cheaper storage after 90 days
resource "aws_s3_bucket_lifecycle_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  rule {
    id     = "archive-old-uploads"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}

# ---------------------------------------------------------------------------
# IAM User — app access to S3 only
# ---------------------------------------------------------------------------

resource "aws_iam_user" "app_s3" {
  name = "${var.app_name}-s3-user"
}

resource "aws_iam_access_key" "app_s3" {
  user = aws_iam_user.app_s3.name
}

resource "aws_iam_user_policy" "app_s3" {
  name = "${var.app_name}-s3-policy"
  user = aws_iam_user.app_s3.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
        ]
        Resource = "${aws_s3_bucket.attachments.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.attachments.arn
      }
    ]
  })
}
