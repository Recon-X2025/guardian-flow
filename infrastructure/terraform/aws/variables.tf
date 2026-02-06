variable "project_name" {
  description = "Project name for resource naming"
  default     = "guardian-flow"
}

variable "environment" {
  description = "Environment (dev/staging/prod)"
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "mongodb_uri" {
  description = "MongoDB Atlas connection URI"
  type        = string
  sensitive   = true
}

variable "app_cpu" {
  description = "ECS task CPU units"
  default     = "256"
}

variable "app_memory" {
  description = "ECS task memory (MB)"
  default     = "512"
}

variable "app_instance_count" {
  description = "Number of app instances"
  default     = 2
}

variable "ecr_repository" {
  description = "ECR repository URL"
  type        = string
}

variable "app_version" {
  description = "Docker image tag"
  default     = "latest"
}

variable "ssl_certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
}

variable "frontend_url" {
  description = "Frontend URL for CORS"
  type        = string
}
