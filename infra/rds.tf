# ---------------------------------------------------------------------------
# Security Group — RDS (only accessible from EC2)
# ---------------------------------------------------------------------------

resource "aws_security_group" "rds" {
  name        = "${var.app_name}-rds-sg"
  description = "GeoTask RDS — access from app server only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "PostgreSQL from app"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-rds-sg"
  }
}

# ---------------------------------------------------------------------------
# RDS Subnet Group (requires subnets in at least 2 AZs)
# ---------------------------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "${var.app_name}-db-subnet-group"
  }
}

# ---------------------------------------------------------------------------
# RDS PostgreSQL Instance
# ---------------------------------------------------------------------------

resource "aws_db_instance" "postgres" {
  identifier     = "${var.app_name}-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  db_name  = "geotask"
  username = var.db_username
  password = var.db_password

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100 # Auto-scaling up to 100GB
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period = 7       # 7 days of automated backups
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  deletion_protection = true # Prevent accidental deletion
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.app_name}-db-final-snapshot"

  tags = {
    Name = "${var.app_name}-db"
  }
}
