@id("core/tenant#belongs")
permit (
  principal,
  action == cam::Action::"core/tenant#belongs",
  resource is core::tenant
)
when { ((principal in resource.rel_member) || (principal in resource.rel_external_member)) };

@id("core/tenant#manage")
permit (
  principal,
  action == cam::Action::"core/tenant#manage",
  resource is core::tenant
)
when { (principal in resource.rel_admin) };

@id("core/tenant#manage_roles")
permit (
  principal,
  action == cam::Action::"core/tenant#manage_roles",
  resource is core::tenant
)
when { ((principal in resource.rel_role_manager) || (principal in resource.rel_admin)) };

@id("core/tenant#view_audit")
permit (
  principal,
  action == cam::Action::"core/tenant#view_audit",
  resource is core::tenant
)
when { ((principal in resource.rel_security_admin) || (principal in resource.rel_admin)) };

@id("core/tenant#revoke_session")
permit (
  principal,
  action == cam::Action::"core/tenant#revoke_session",
  resource is core::tenant
)
when { ((principal in resource.rel_security_admin) || (principal in resource.rel_admin)) };

@id("core/unit#manage")
permit (
  principal,
  action == cam::Action::"core/unit#manage",
  resource is core::unit
)
when { ((principal in resource.rel_admin) || (principal in resource.ttu_parent__manage)) };

@id("core/unit#view_directory")
permit (
  principal,
  action == cam::Action::"core/unit#view_directory",
  resource is core::unit
)
when { ((principal in resource.rel_member) || (principal in resource.rel_manage)) };

@id("core/unit#manage_membership")
permit (
  principal,
  action == cam::Action::"core/unit#manage_membership",
  resource is core::unit
)
when { ((principal in resource.rel_manage) || (principal in resource.ttu_admin_scope__delegate)) };

@id("files/folder#editors")
permit (
  principal,
  action == cam::Action::"files/folder#editors",
  resource is files::folder
)
when { ((principal in resource.rel_editor) || (principal in resource.rel_owner) || (principal in resource.ttu_parent__editors)) };

@id("files/folder#viewers")
permit (
  principal,
  action == cam::Action::"files/folder#viewers",
  resource is files::folder
)
when { ((principal in resource.rel_viewer) || (principal in resource.rel_editors) || (principal in resource.ttu_parent__viewers)) };

@id("files/folder#restricted_inherited")
permit (
  principal,
  action == cam::Action::"files/folder#restricted_inherited",
  resource is files::folder
)
when { ((principal in resource.rel_restricted_external) || (principal in resource.ttu_parent__restricted_inherited)) };

@id("files/folder#read")
permit (
  principal,
  action == cam::Action::"files/folder#read",
  resource is files::folder
)
when { (((principal in resource.rel_viewers) && !(principal in resource.rel_restricted_external)) && !(principal in resource.ttu_parent__restricted_inherited)) };

@id("files/folder#write")
permit (
  principal,
  action == cam::Action::"files/folder#write",
  resource is files::folder
)
when { ((principal in resource.rel_editors) && !(principal in resource.rel_restricted_external)) };

@id("files/folder#share")
permit (
  principal,
  action == cam::Action::"files/folder#share",
  resource is files::folder
)
when { (principal in resource.rel_owner) };

@id("files/file#editors")
permit (
  principal,
  action == cam::Action::"files/file#editors",
  resource is files::file
)
when { ((principal in resource.rel_editor) || (principal in resource.rel_owner) || (principal in resource.ttu_parent__editors)) };

@id("files/file#viewers")
permit (
  principal,
  action == cam::Action::"files/file#viewers",
  resource is files::file
)
when { ((principal in resource.rel_viewer) || (principal in resource.rel_editors) || (principal in resource.ttu_parent__viewers)) };

@id("files/file#read")
permit (
  principal,
  action == cam::Action::"files/file#read",
  resource is files::file
)
when { ((principal in resource.rel_viewers) && !(principal in resource.ttu_parent__restricted_inherited)) };

@id("files/file#write")
permit (
  principal,
  action == cam::Action::"files/file#write",
  resource is files::file
)
when { ((principal in resource.rel_editors) && !(principal in resource.ttu_parent__restricted_inherited)) };

@id("files/file#delete")
permit (
  principal,
  action == cam::Action::"files/file#delete",
  resource is files::file
)
when { ((principal in resource.rel_owner) || (principal in resource.ttu_parent__owner)) };

@id("files/file#share")
permit (
  principal,
  action == cam::Action::"files/file#share",
  resource is files::file
)
when { ((principal in resource.rel_owner) || (principal in resource.ttu_parent__owner)) };

@id("proj/project#members")
permit (
  principal,
  action == cam::Action::"proj/project#members",
  resource is proj::project
)
when { ((principal in resource.rel_member) || (principal in resource.rel_owner)) };

@id("proj/project#view")
permit (
  principal,
  action == cam::Action::"proj/project#view",
  resource is proj::project
)
when { ((principal in resource.rel_members) || (principal in resource.rel_guest) || (principal in resource.ttu_ancestor__manage)) };

@id("proj/project#admin")
permit (
  principal,
  action == cam::Action::"proj/project#admin",
  resource is proj::project
)
when { (principal in resource.rel_owner) };

@id("proj/tool_instance#use")
permit (
  principal,
  action == cam::Action::"proj/tool_instance#use",
  resource is proj::tool_instance
)
when { ((principal in resource.ttu_parent__members) || (principal in resource.rel_operator)) };

@id("proj/tool_instance#view")
permit (
  principal,
  action == cam::Action::"proj/tool_instance#view",
  resource is proj::tool_instance
)
when { (principal in resource.ttu_parent__view) };

@id("proj/tool_instance#config")
permit (
  principal,
  action == cam::Action::"proj/tool_instance#config",
  resource is proj::tool_instance
)
when { (principal in resource.ttu_parent__admin) };
