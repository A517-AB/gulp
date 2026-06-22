# Page Dependency Tree

Generated: 2026-06-22T06:57:54.930Z

> ◆ = referenced from multiple zones

```mermaid
graph TD

  subgraph electron["electron"]
    electron_filesystem_handlers["handlers"] --> electron_filesystem_types["types"]
    electron_filesystem_types["types"] --> src_shared_filesystem["filesystem ◆"]
    electron_history["history"] --> src_shared_history["history ◆"]
    electron_main["main"] --> electron_Terminal["Terminal"]
    electron_main["main"] --> electron_queues["queues"]
    electron_main["main"] --> electron_filesystem_handlers["handlers"]
    electron_main["main"] --> electron_snippets["snippets"]
    electron_main["main"] --> electron_git["git"]
    electron_main["main"] --> electron_github["github"]
    electron_main["main"] --> electron_history["history"]
    electron_main["main"] --> electron_notes["notes"]
    electron_main["main"] --> electron_notifications_index["index"]
    electron_main["main"] --> electron_ipc_handlers["handlers"]
    electron_main["main"] --> electron_jules_events["jules-events"]
    electron_main["main"] --> electron_store["store"]
    electron_snippets["snippets"] --> src_shared_fuse["fuse ◆"]
    electron_snippets["snippets"] --> electron_store["store"]
    electron_notes["notes"] --> src_shared_local_data_index["index ◆"]
    src_shared_local_data_index["index"] --> src_shared_bridge["bridge ◆"]
    src_shared_local_data_index["index"] --> src_shared_local_data_types["types ◆"]
    electron_preload["preload"] --> electron_ipc_bridge["bridge"]
  end

  subgraph pages_electron["pages/electron"]
      src_renderer_pages_electron_ActivityPage["ActivityPage"] --> src_renderer_store_app["app ◆"]
      src_renderer_pages_electron_ActivityPage["ActivityPage"] --> src_renderer_ui_input["input ◆"]
      src_renderer_pages_electron_ActivityPage["ActivityPage"] --> src_renderer_ui_button["button ◆"]
      src_renderer_store_app["app"] --> src_shared_bridge["bridge ◆"]
      src_renderer_ui_input["input"] --> src_renderer_utils_index["index ◆"]
      src_renderer_utils_index["index"] --> src_renderer_utils_activity["activity ◆"]
      src_renderer_utils_index["index"] --> src_renderer_utils_snippets["snippets ◆"]
      src_renderer_utils_index["index"] --> src_renderer_utils_types["types ◆"]
      src_renderer_utils_index["index"] --> src_renderer_utils_utils["utils ◆"]
      src_renderer_ui_button["button"] --> src_renderer_utils_index["index ◆"]
      src_renderer_pages_electron_ExplorerPage["ExplorerPage"] --> src_renderer_components_shared_FileTree_index["index"]
      src_renderer_pages_electron_ExplorerPage["ExplorerPage"] --> src_renderer_pages_electron_FileEditor["FileEditor"]
      src_renderer_pages_electron_ExplorerPage["ExplorerPage"] --> src_shared_bridge["bridge ◆"]
      src_renderer_pages_electron_ExplorerPage["ExplorerPage"] --> src_renderer_utils_index["index ◆"]
      src_renderer_pages_electron_ExplorerPage["ExplorerPage"] --> src_renderer_store_explorer["explorer"]
      src_renderer_pages_electron_ExplorerPage["ExplorerPage"] --> src_renderer_utils_git["git ◆"]
      src_renderer_pages_electron_ExplorerPage["ExplorerPage"] --> src_renderer_ui_dropdown_menu["dropdown-menu ◆"]
      src_renderer_pages_electron_ExplorerPage["ExplorerPage"] --> src_renderer_components_quickie_use_quickie["use-quickie"]
      src_renderer_pages_electron_ExplorerPage["ExplorerPage"] --> src_renderer_components_quickie_types["types ◆"]
      src_renderer_components_shared_FileTree_index["index"] --> src_renderer_components_shared_FileTree_FileTree["FileTree ◆"]
      src_renderer_components_shared_FileTree_index["index"] --> src_renderer_components_shared_FileTree_types["types ◆"]
      src_renderer_components_shared_FileTree_FileTree["FileTree"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_shared_FileTree_FileTree["FileTree"] --> src_renderer_hooks_use_file_tree["use-file-tree"]
      src_renderer_components_shared_FileTree_FileTree["FileTree"] --> src_renderer_components_shared_FileTree_types["types ◆"]
      src_renderer_components_shared_FileTree_FileTree["FileTree"] --> src_shared_filesystem["filesystem ◆"]
      src_renderer_components_shared_FileTree_FileTree["FileTree"] --> src_shared_bridge["bridge ◆"]
      src_renderer_components_shared_FileTree_FileTree["FileTree"] --> src_renderer_ui_context_menu["context-menu ◆"]
      src_renderer_components_shared_FileTree_FileTree["FileTree"] --> src_renderer_utils_git["git ◆"]
      src_renderer_components_shared_FileTree_types["types"] --> src_shared_filesystem["filesystem ◆"]
      src_renderer_components_shared_FileTree_types["types"] --> src_renderer_hooks_use_file_tree["use-file-tree"]
      src_renderer_pages_electron_FileEditor["FileEditor"] --> src_renderer_ui_code_editor["code-editor"]
      src_renderer_pages_electron_FileEditor["FileEditor"] --> src_renderer_providers_theme["theme ◆"]
      src_renderer_pages_electron_FileEditor["FileEditor"] --> src_renderer_components_markdown_types["types"]
      src_renderer_ui_code_editor["code-editor"] --> src_renderer_providers_theme["theme ◆"]
      src_renderer_ui_code_editor["code-editor"] --> src_renderer_utils_index["index ◆"]
      src_renderer_utils_snippets["snippets"] --> src_renderer_utils_types["types"]
      src_renderer_utils_types["types"] --> src_types_snippets["snippets ◆"]
      src_renderer_store_explorer["explorer"] --> src_renderer_utils_git["git ◆"]
      src_renderer_ui_dropdown_menu["dropdown-menu"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_quickie_use_quickie["use-quickie"] --> src_renderer_library_notification_index["index ◆"]
      src_renderer_components_quickie_use_quickie["use-quickie"] --> src_renderer_components_quickie_types["types ◆"]
      src_renderer_components_quickie_use_quickie["use-quickie"] --> src_renderer_store_quickie["quickie ◆"]
      src_renderer_library_notification_index["index"] --> src_renderer_library_notification_use_notification["use-notification ◆"]
      src_renderer_library_notification_index["index"] --> src_renderer_library_notification_defaults["defaults ◆"]
      src_renderer_library_notification_index["index"] --> src_renderer_library_notification_types["types ◆"]
      src_renderer_store_quickie["quickie"] --> src_shared_bridge["bridge ◆"]
      src_renderer_store_quickie["quickie"] --> src_renderer_components_quickie_types["types ◆"]
      src_renderer_pages_electron_GanttPage["GanttPage"] --> src_shared_local_data_index["index ◆"]
      src_renderer_pages_electron_GanttPage["GanttPage"] --> src_renderer_components_markdown_NoteEditor["NoteEditor ◆"]
      src_renderer_pages_electron_GanttPage["GanttPage"] --> src_renderer_providers_theme["theme ◆"]
      src_renderer_pages_electron_GanttPage["GanttPage"] --> src_renderer_components_markdown_types["types"]
      src_renderer_components_markdown_NoteEditor["NoteEditor"] --> src_shared_bridge["bridge ◆"]
      src_renderer_components_markdown_NoteEditor["NoteEditor"] --> src_renderer_components_markdown_Editor["Editor ◆"]
      src_renderer_components_markdown_NoteEditor["NoteEditor"] --> src_renderer_components_markdown_types["types ◆"]
      src_renderer_components_markdown_Editor["Editor"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_markdown_Editor["Editor"] --> src_renderer_providers_theme["theme ◆"]
      src_renderer_components_markdown_Editor["Editor"] --> src_renderer_components_markdown_types["types ◆"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_components_shared_DynamicDropdown["DynamicDropdown"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_components_workspace_activity_terminal_console["terminal-console"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_button["button ◆"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_badge["badge ◆"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_avatar["avatar ◆"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_tabs["tabs"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_select["select"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_separator["separator"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_label["label"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_scroll_area["scroll-area ◆"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_sheet["sheet"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_dialog["dialog"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_tooltip["tooltip ◆"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_context_menu["context-menu ◆"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_accordion["accordion"]
      src_renderer_pages_electron_KitPage["KitPage"] --> src_renderer_ui_command["command"]
      src_renderer_components_shared_DynamicDropdown["DynamicDropdown"] --> src_renderer_ui_popover["popover ◆"]
      src_renderer_components_shared_DynamicDropdown["DynamicDropdown"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_popover["popover"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_workspace_activity_terminal_console["terminal-console"] --> src_renderer_components_workspace_activity_types["types ◆"]
      src_renderer_ui_badge["badge"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_avatar["avatar"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_tabs["tabs"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_select["select"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_separator["separator"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_label["label"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_scroll_area["scroll-area"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_sheet["sheet"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_dialog["dialog"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_tooltip["tooltip"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_context_menu["context-menu"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_accordion["accordion"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_command["command"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_command["command"] --> src_renderer_ui_dialog["dialog"]
      src_renderer_pages_electron_QueuesPage["QueuesPage"] --> src_shared_bridge["bridge ◆"]
      src_renderer_pages_electron_QueuesPage["QueuesPage"] --> src_renderer_store_app["app ◆"]
      src_renderer_pages_electron_QueuesPage["QueuesPage"] --> src_renderer_ui_inline_edit["inline-edit"]
      src_renderer_ui_inline_edit["inline-edit"] --> src_renderer_utils_utils["utils"]
      src_renderer_pages_electron_ReadingPage["ReadingPage"] --> src_renderer_providers_theme["theme ◆"]
      src_renderer_pages_electron_RemindersPage["RemindersPage"] --> src_renderer_utils_index["index ◆"]
      src_renderer_pages_electron_RemindersPage["RemindersPage"] --> src_shared_bridge["bridge ◆"]
      src_renderer_pages_electron_ShipPage["ShipPage"] --> src_renderer_ui_scroll_area["scroll-area ◆"]
      src_renderer_pages_electron_ShipPage["ShipPage"] --> src_renderer_components_ship_RepoCommandPalette["RepoCommandPalette"]
      src_renderer_pages_electron_ShipPage["ShipPage"] --> src_renderer_utils_index["index ◆"]
      src_renderer_pages_electron_ShipPage["ShipPage"] --> src_renderer_store_app["app ◆"]
      src_renderer_pages_electron_ShipPage["ShipPage"] --> src_renderer_components_ship_SyncManager["SyncManager"]
      src_renderer_pages_electron_ShipPage["ShipPage"] --> src_renderer_store_sync["sync ◆"]
      src_renderer_pages_electron_ShipPage["ShipPage"] --> src_renderer_store_ship["ship"]
      src_renderer_pages_electron_ShipPage["ShipPage"] --> src_renderer_library_notification_use_notification["use-notification"]
      src_renderer_components_ship_RepoCommandPalette["RepoCommandPalette"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_ship_SyncManager["SyncManager"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_ship_SyncManager["SyncManager"] --> src_renderer_store_sync["sync ◆"]
      src_renderer_store_sync["sync"] --> src_shared_bridge["bridge ◆"]
      src_renderer_store_ship["ship"] --> src_renderer_store_app["app ◆"]
      src_renderer_store_ship["ship"] --> src_shared_bridge["bridge ◆"]
      src_renderer_library_notification_use_notification["use-notification"] --> src_shared_bridge["bridge ◆"]
      src_renderer_library_notification_use_notification["use-notification"] --> src_renderer_library_notification_types["types ◆"]
      src_renderer_library_notification_use_notification["use-notification"] --> src_renderer_library_notification_defaults["defaults ◆"]
      src_renderer_library_notification_defaults["defaults"] --> src_renderer_library_notification_types["types ◆"]
      src_renderer_pages_electron_SnippetsPage["SnippetsPage"] --> src_renderer_hooks_use_snippets["use-snippets"]
      src_renderer_pages_electron_SnippetsPage["SnippetsPage"] --> src_renderer_ui_inline_edit["inline-edit"]
      src_renderer_pages_electron_SnippetsPage["SnippetsPage"] --> src_renderer_ui_code_editor["code-editor"]
      src_renderer_pages_electron_SnippetsPage["SnippetsPage"] --> src_renderer_components_shared_DynamicDropdown["DynamicDropdown"]
      src_renderer_pages_electron_SnippetsPage["SnippetsPage"] --> src_renderer_ui_dialog["dialog"]
      src_renderer_pages_electron_SnippetsPage["SnippetsPage"] --> src_renderer_lib_languages["languages"]
      src_renderer_pages_electron_SnippetsPage["SnippetsPage"] --> src_shared_fuse["fuse ◆"]
      src_renderer_pages_electron_SnippetsPage["SnippetsPage"] --> src_renderer_components_git_GitSyncButton["GitSyncButton"]
      src_renderer_hooks_use_snippets["use-snippets"] --> src_shared_bridge["bridge ◆"]
      src_renderer_hooks_use_snippets["use-snippets"] --> src_shared_fuse["fuse ◆"]
      src_renderer_lib_languages["languages"] --> src_types_snippets["snippets ◆"]
      src_renderer_components_git_GitSyncButton["GitSyncButton"] --> src_shared_bridge["bridge ◆"]
      src_renderer_components_git_GitSyncButton["GitSyncButton"] --> src_renderer_library_notification_index["index ◆"]
      src_renderer_pages_electron_TardisPage["TardisPage"] --> src_shared_bridge["bridge ◆"]
      src_renderer_pages_electron_TardisPage["TardisPage"] --> src_renderer_components_shared_ScheduleForm["ScheduleForm"]
      src_renderer_pages_electron_TardisPage["TardisPage"] --> src_renderer_library_notification_index["index ◆"]
      src_renderer_pages_electron_TimePage["TimePage"] --> src_renderer_library_notification_index["index ◆"]
      src_renderer_pages_electron_TimePage["TimePage"] --> src_shared_bridge["bridge ◆"]
  end

  subgraph pages_web["pages/web"]
    subgraph pages_web_jules["jules/"]
    end
    subgraph pages_web_overview["overview/"]
      src_renderer_pages_web_overview_OverviewPage["OverviewPage"] --> src_renderer_components_overview_index["index"]
      src_renderer_components_overview_index["index"] --> src_renderer_components_overview_OverviewPage["OverviewPage ◆"]
      src_renderer_components_overview_index["index"] --> src_renderer_components_overview_CommandInput["CommandInput ◆"]
      src_renderer_components_overview_index["index"] --> src_renderer_components_overview_BlockDisplay["BlockDisplay ◆"]
      src_renderer_components_overview_OverviewPage["OverviewPage"] --> src_shared_bridge["bridge ◆"]
      src_renderer_components_overview_OverviewPage["OverviewPage"] --> src_renderer_store_commands["commands"]
      src_renderer_components_overview_OverviewPage["OverviewPage"] --> src_renderer_store_app["app ◆"]
      src_renderer_components_overview_OverviewPage["OverviewPage"] --> src_shared_commands_index["index ◆"]
      src_renderer_components_overview_OverviewPage["OverviewPage"] --> src_renderer_components_overview_CommandInput["CommandInput ◆"]
      src_renderer_components_overview_OverviewPage["OverviewPage"] --> src_renderer_components_overview_BlockDisplay["BlockDisplay ◆"]
      src_renderer_components_overview_OverviewPage["OverviewPage"] --> src_renderer_components_overview_TerminalPane["TerminalPane"]
      src_renderer_components_overview_OverviewPage["OverviewPage"] --> src_renderer_ui_diff_viewer["diff-viewer ◆"]
      src_renderer_components_overview_CommandInput["CommandInput"] --> src_shared_commands_index["index ◆"]
      src_renderer_components_overview_CommandInput["CommandInput"] --> src_renderer_hooks_use_history["use-history"]
      src_renderer_components_overview_CommandInput["CommandInput"] --> src_renderer_components_overview_GhostInput["GhostInput"]
      src_renderer_components_overview_CommandInput["CommandInput"] --> src_renderer_components_overview_CommandMenu["CommandMenu"]
      src_renderer_components_overview_CommandInput["CommandInput"] --> src_renderer_components_overview_HistoryPanel["HistoryPanel"]
      src_renderer_components_overview_CommandInput["CommandInput"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_overview_BlockDisplay["BlockDisplay"] --> src_renderer_providers_theme["theme ◆"]
      src_renderer_components_overview_BlockDisplay["BlockDisplay"] --> src_renderer_utils_index["index ◆"]
    end
      src_renderer_pages_web_OverviewPage["OverviewPage"] --> src_renderer_pages_web_overview_OverviewPage["OverviewPage"]
  end

  subgraph pages_shared["pages/shared"]
      src_renderer_pages_shared_HomePage["HomePage"] --> src_renderer_components_shared_Clock["Clock"]
      src_renderer_pages_shared_JulesPage["JulesPage"] --> src_renderer_components_workspace_activity_index["index"]
      src_renderer_pages_shared_JulesPage["JulesPage"] --> src_renderer_components_workspace_session_list["session-list"]
      src_renderer_pages_shared_JulesPage["JulesPage"] --> src_renderer_components_workspace_code_diff_sidebar["code-diff-sidebar"]
      src_renderer_pages_shared_JulesPage["JulesPage"] --> src_renderer_hooks_use_resizable["use-resizable"]
      src_renderer_pages_shared_JulesPage["JulesPage"] --> src_renderer_store_app["app ◆"]
      src_renderer_pages_shared_JulesPage["JulesPage"] --> src_renderer_components_workspace_flying_jules["flying-jules ◆"]
      src_renderer_components_workspace_activity_index["index"] --> src_renderer_components_workspace_activity_activity_feed["activity-feed ◆"]
      src_renderer_components_workspace_activity_index["index"] --> src_renderer_components_workspace_activity_activity_item["activity-item ◆"]
      src_renderer_components_workspace_activity_index["index"] --> src_renderer_components_workspace_activity_types["types ◆"]
      src_renderer_components_workspace_activity_activity_feed["activity-feed"] --> src_renderer_ui_scroll_area["scroll-area ◆"]
      src_renderer_components_workspace_activity_activity_feed["activity-feed"] --> src_renderer_ui_button["button ◆"]
      src_renderer_components_workspace_activity_activity_feed["activity-feed"] --> src_renderer_store_app["app ◆"]
      src_renderer_components_workspace_activity_activity_feed["activity-feed"] --> src_renderer_components_workspace_activity_types["types ◆"]
      src_renderer_components_workspace_activity_activity_feed["activity-feed"] --> src_renderer_components_workspace_activity_activity_item["activity-item ◆"]
      src_renderer_components_workspace_activity_activity_feed["activity-feed"] --> src_renderer_components_workspace_activity_activity_feed_header["activity-feed-header"]
      src_renderer_components_workspace_activity_activity_feed["activity-feed"] --> src_renderer_components_workspace_activity_activity_feed_form["activity-feed-form"]
      src_renderer_components_workspace_activity_activity_item["activity-item"] --> src_renderer_components_workspace_activity_types["types ◆"]
      src_renderer_components_workspace_activity_activity_item["activity-item"] --> src_renderer_components_workspace_activity_single_activity["single-activity"]
      src_renderer_components_workspace_session_list["session-list"] --> src_renderer_ui_scroll_area["scroll-area ◆"]
      src_renderer_components_workspace_session_list["session-list"] --> src_renderer_ui_input["input ◆"]
      src_renderer_components_workspace_session_list["session-list"] --> src_renderer_ui_badge["badge ◆"]
      src_renderer_components_workspace_session_list["session-list"] --> src_renderer_ui_tooltip["tooltip ◆"]
      src_renderer_components_workspace_session_list["session-list"] --> src_renderer_ui_card_spotlight["card-spotlight ◆"]
      src_renderer_components_workspace_session_list["session-list"] --> src_renderer_utils_activity["activity ◆"]
      src_renderer_components_workspace_session_list["session-list"] --> src_renderer_hooks_use_session_list["use-session-list ◆"]
      src_renderer_components_workspace_session_list["session-list"] --> src_renderer_store_app["app ◆"]
      src_renderer_components_workspace_session_list["session-list"] --> src_renderer_components_workspace_session_status["session-status ◆"]
      src_renderer_components_workspace_session_list["session-list"] --> src_renderer_components_workspace_SessionContextMenu["SessionContextMenu ◆"]
      src_renderer_ui_card_spotlight["card-spotlight"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_card_spotlight["card-spotlight"] --> src_renderer_providers_theme["theme ◆"]
      src_renderer_hooks_use_session_list["use-session-list"] --> src_renderer_store_app["app ◆"]
      src_renderer_components_workspace_SessionContextMenu["SessionContextMenu"] --> src_renderer_store_app["app ◆"]
      src_renderer_components_workspace_code_diff_sidebar["code-diff-sidebar"] --> src_renderer_ui_scroll_area["scroll-area ◆"]
      src_renderer_components_workspace_code_diff_sidebar["code-diff-sidebar"] --> src_renderer_ui_diff_viewer["diff-viewer ◆"]
      src_renderer_components_workspace_code_diff_sidebar["code-diff-sidebar"] --> src_renderer_components_workspace_activity_activity_artifacts["activity-artifacts ◆"]
      src_renderer_components_workspace_code_diff_sidebar["code-diff-sidebar"] --> src_renderer_store_app["app ◆"]
      src_renderer_components_workspace_code_diff_sidebar["code-diff-sidebar"] --> src_shared_bridge["bridge ◆"]
      src_renderer_ui_diff_viewer["diff-viewer"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_workspace_activity_activity_artifacts["activity-artifacts"] --> src_renderer_store_app["app ◆"]
      src_renderer_components_workspace_activity_activity_artifacts["activity-artifacts"] --> src_renderer_components_workspace_changeset_summary["changeset-summary"]
      src_renderer_components_workspace_activity_activity_artifacts["activity-artifacts"] --> src_renderer_components_workspace_activity_terminal_console["terminal-console"]
      src_renderer_pages_shared_NotesPage["NotesPage"] --> src_renderer_components_markdown_NoteEditor["NoteEditor ◆"]
    subgraph pages_shared_settings["settings/"]
      src_renderer_pages_shared_settings_panels_ColorPalettePanel["ColorPalettePanel"] --> src_renderer_providers_theme["theme ◆"]
      src_renderer_pages_shared_settings_panels_ColorPalettePanel["ColorPalettePanel"] --> src_renderer_utils_index["index ◆"]
      src_renderer_pages_shared_settings_panels_connection_tests["connection-tests"] --> src_shared_bridge["bridge ◆"]
      src_renderer_pages_shared_settings_panels_connection_tests["connection-tests"] --> src_renderer_pages_shared_settings_types["types"]
      src_renderer_pages_shared_settings_panels_NotificationPanel["NotificationPanel"] --> src_renderer_library_notification_index["index ◆"]
      src_renderer_pages_shared_settings_panels_SessionPicker["SessionPicker"] --> src_renderer_hooks_use_session_list["use-session-list ◆"]
      src_renderer_pages_shared_settings_panels_TestingPanel["TestingPanel"] --> src_shared_bridge["bridge ◆"]
      src_renderer_pages_shared_settings_panels_TestingPanel["TestingPanel"] --> src_renderer_pages_shared_settings_panels_connection_tests["connection-tests"]
      src_renderer_pages_shared_settings_panels_TestingPanel["TestingPanel"] --> src_renderer_pages_shared_settings_panels_TestRow["TestRow"]
      src_renderer_pages_shared_settings_panels_TestingPanel["TestingPanel"] --> src_renderer_pages_shared_settings_types["types"]
      src_renderer_pages_shared_settings_panels_TestRow["TestRow"] --> src_renderer_pages_shared_settings_types["types"]
      src_renderer_pages_shared_settings_panels_TypographyPanel["TypographyPanel"] --> src_renderer_providers_theme["theme ◆"]
      src_renderer_pages_shared_settings_SettingsPage["SettingsPage"] --> src_renderer_pages_shared_settings_Section["Section"]
      src_renderer_pages_shared_settings_SettingsPage["SettingsPage"] --> src_renderer_pages_shared_settings_panels_TestingPanel["TestingPanel"]
      src_renderer_pages_shared_settings_SettingsPage["SettingsPage"] --> src_renderer_pages_shared_settings_panels_NotificationPanel["NotificationPanel"]
      src_renderer_pages_shared_settings_SettingsPage["SettingsPage"] --> src_renderer_pages_shared_settings_panels_TypographyPanel["TypographyPanel"]
      src_renderer_pages_shared_settings_SettingsPage["SettingsPage"] --> src_renderer_pages_shared_settings_panels_ColorPalettePanel["ColorPalettePanel"]
    end
  end

  subgraph components["components"]
    subgraph components_git["git/"]
    end
    subgraph components_markdown["markdown/"]
    end
    subgraph components_overview["overview/"]
      src_shared_commands_index["index"] --> src_shared_commands_types["types"]
      src_shared_commands_index["index"] --> src_shared_commands_triggers["triggers"]
      src_shared_commands_index["index"] --> src_shared_commands_parse["parse"]
      src_shared_commands_index["index"] --> src_shared_commands_execute["execute"]
      src_renderer_hooks_use_history["use-history"] --> src_shared_bridge["bridge ◆"]
      src_renderer_hooks_use_history["use-history"] --> src_shared_history["history ◆"]
      src_renderer_components_overview_CommandMenu["CommandMenu"] --> src_shared_commands_index["index ◆"]
      src_renderer_components_overview_HistoryPanel["HistoryPanel"] --> src_shared_history["history ◆"]
      src_renderer_store_commands["commands"] --> src_shared_commands_index["index ◆"]
      src_renderer_store_commands["commands"] --> src_shared_bridge["bridge ◆"]
      src_renderer_components_overview_TerminalPane["TerminalPane"] --> src_shared_bridge["bridge ◆"]
      src_renderer_components_overview_TerminalPane["TerminalPane"] --> src_renderer_providers_theme["theme ◆"]
    end
    subgraph components_quickie["quickie/"]
      src_renderer_components_quickie_presets["presets"] --> src_renderer_components_quickie_types["types ◆"]
    end
    subgraph components_shared["shared/"]
      src_renderer_hooks_use_file_tree["use-file-tree"] --> src_shared_bridge["bridge ◆"]
      src_renderer_hooks_use_file_tree["use-file-tree"] --> src_shared_filesystem["filesystem ◆"]
      src_renderer_components_shared_SnippetPicker["SnippetPicker"] --> src_renderer_ui_popover["popover ◆"]
      src_renderer_components_shared_SnippetPicker["SnippetPicker"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_shared_SnippetPicker["SnippetPicker"] --> src_types_snippets["snippets ◆"]
    end
    subgraph components_ship["ship/"]
      src_renderer_components_ship_Dropdown["Dropdown"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_ship_SyncManager_SyncManager["SyncManager"] --> src_renderer_store_sync["sync ◆"]
      src_renderer_components_ship_SyncManager_SyncManager["SyncManager"] --> src_renderer_components_ship_SyncManager_types["types"]
      src_renderer_components_ship_SyncManager_SyncManager["SyncManager"] --> src_renderer_utils_index["index ◆"]
    end
    subgraph components_workspace["workspace/"]
      src_renderer_components_workspace_changeset_summary["changeset-summary"] --> src_renderer_store_app["app ◆"]
      src_renderer_components_workspace_changeset_summary["changeset-summary"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_workspace_activity_activity_feed_form["activity-feed-form"] --> src_renderer_ui_textarea["textarea"]
      src_renderer_components_workspace_activity_activity_feed_form["activity-feed-form"] --> src_renderer_ui_button["button ◆"]
      src_renderer_components_workspace_activity_activity_feed_form["activity-feed-form"] --> src_renderer_hooks_use_snippets["use-snippets"]
      src_renderer_components_workspace_activity_activity_feed_form["activity-feed-form"] --> src_renderer_utils_index["index ◆"]
      src_renderer_ui_textarea["textarea"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_workspace_activity_activity_feed_header["activity-feed-header"] --> src_renderer_components_workspace_activity_types["types ◆"]
      src_renderer_components_workspace_activity_activity_feed_header["activity-feed-header"] --> src_renderer_ui_button["button ◆"]
      src_renderer_components_workspace_activity_activity_feed_header["activity-feed-header"] --> src_renderer_ui_dropdown_menu["dropdown-menu ◆"]
      src_renderer_components_workspace_activity_activity_feed_header["activity-feed-header"] --> src_renderer_components_workspace_flying_jules["flying-jules ◆"]
      src_renderer_components_workspace_activity_activity_feed_header["activity-feed-header"] --> src_renderer_components_workspace_session_status["session-status ◆"]
      src_renderer_components_workspace_activity_activity_feed_header["activity-feed-header"] --> src_renderer_store_app["app ◆"]
      src_renderer_components_workspace_activity_single_activity["single-activity"] --> src_renderer_components_workspace_activity_types["types ◆"]
      src_renderer_components_workspace_activity_single_activity["single-activity"] --> src_renderer_ui_card["card"]
      src_renderer_components_workspace_activity_single_activity["single-activity"] --> src_renderer_ui_badge["badge ◆"]
      src_renderer_components_workspace_activity_single_activity["single-activity"] --> src_renderer_ui_avatar["avatar ◆"]
      src_renderer_components_workspace_activity_single_activity["single-activity"] --> src_renderer_ui_button["button ◆"]
      src_renderer_components_workspace_activity_single_activity["single-activity"] --> src_renderer_components_workspace_flying_jules["flying-jules ◆"]
      src_renderer_components_workspace_activity_single_activity["single-activity"] --> src_renderer_components_workspace_plan_content["plan-content"]
      src_renderer_components_workspace_activity_single_activity["single-activity"] --> src_renderer_components_workspace_activity_markdown["markdown"]
      src_renderer_components_workspace_activity_single_activity["single-activity"] --> src_renderer_components_workspace_activity_activity_artifacts["activity-artifacts"]
      src_renderer_ui_card["card"] --> src_renderer_utils_index["index ◆"]
      src_renderer_components_workspace_plan_content["plan-content"] --> src_renderer_ui_button["button ◆"]
    end
  end

  subgraph hooks["hooks"]
    src_renderer_hooks_use_app_sync["use-app-sync"] --> src_renderer_store_app["app ◆"]
    src_renderer_hooks_use_presets["use-presets"] --> src_renderer_lib_presets["presets"]
    src_renderer_hooks_use_todos["use-todos"] --> src_renderer_lib_todos["todos"]
  end

  subgraph store["store"]
  end

  subgraph shared["shared"]
    src_shared_bridge_test["bridge.test"] --> src_shared_bridge["bridge"]
    src_shared_commands_execute["execute"] --> src_shared_commands_types["types"]
    src_shared_commands_execute["execute"] --> src_shared_commands_triggers["triggers"]
    src_shared_commands_triggers["triggers"] --> src_shared_commands_types["types"]
    src_shared_commands_parse["parse"] --> src_shared_commands_types["types"]
    src_shared_electron_d["electron.d"] --> src_shared_filesystem["filesystem ◆"]
    src_shared_electron_d["electron.d"] --> src_shared_fuse["fuse ◆"]
    src_shared_electron_d["electron.d"] --> src_shared_history["history"]
    src_shared_electron_d["electron.d"] --> src_shared_local_data_index["index ◆"]
    src_shared_electron_d["electron.d"] --> src_jules_sdk_ipc["sdk-ipc"]
    src_shared_web_sdk["web-sdk"] --> src_jules_index["index"]
    src_jules_index["index"] --> src_jules_sdk_ipc["sdk-ipc"]
    src_jules_index["index"] --> src_jules_activity["activity"]
    src_jules_index["index"] --> src_jules_session["session"]
    src_jules_index["index"] --> src_jules_stream["stream"]
    src_jules_index["index"] --> src_jules_types["types"]
  end

  %% ◆ = referenced from multiple zones
  style src_shared_filesystem fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_shared_history fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_shared_fuse fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_shared_local_data_index fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_shared_bridge fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_shared_local_data_types fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_store_app fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_ui_input fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_utils_index fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_ui_button fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_shared_FileTree_FileTree fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_shared_FileTree_types fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_providers_theme fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_utils_activity fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_utils_snippets fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_utils_types fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_utils_utils fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_utils_git fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_ui_dropdown_menu fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_library_notification_index fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_quickie_types fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_store_quickie fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_quickie_types fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_markdown_NoteEditor fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_markdown_Editor fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_markdown_types fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_ui_popover fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_workspace_activity_types fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_ui_badge fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_ui_avatar fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_ui_scroll_area fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_ui_tooltip fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_ui_context_menu fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_store_sync fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_store_app fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_library_notification_types fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_library_notification_defaults fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_shared_fuse fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_types_snippets fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_library_notification_use_notification fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_overview_OverviewPage fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_overview_CommandInput fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_overview_BlockDisplay fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_workspace_activity_activity_feed fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_workspace_activity_activity_item fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_ui_card_spotlight fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_utils_activity fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_hooks_use_session_list fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_workspace_session_status fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_workspace_SessionContextMenu fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_ui_diff_viewer fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_workspace_activity_activity_artifacts fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_renderer_components_workspace_flying_jules fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_shared_commands_index fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
  style src_shared_filesystem fill:#1e293b,stroke:#6366f1,color:#e2e8f0,stroke-width:2px
```
