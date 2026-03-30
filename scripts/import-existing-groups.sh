#!/bin/bash
# import-existing-groups.sh
#
# Run this ONCE before `terraform apply` to import Cognito groups
# that were created manually via CLI (superadmins + coordinators).
#
# Usage: cd terraform && bash ../scripts/import-existing-groups.sh

set -e

POOL_ID="eu-west-1_vGQmvqD9f"

echo "Importing superadmins group..."
terraform import module.auth.aws_cognito_user_group.superadmins "${POOL_ID}/superadmins"

echo "Importing coordinators group..."
terraform import module.auth.aws_cognito_user_group.coordinators "${POOL_ID}/coordinators"

echo "Done! You can now run terraform apply."
