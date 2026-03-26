output "server_name" {
  value = hcloud_server.app.name
}

output "server_ipv4" {
  value = hcloud_server.app.ipv4_address
}

output "server_ipv6" {
  value = hcloud_server.app.ipv6_address
}

output "deploy_user" {
  value = var.deploy_username
}
