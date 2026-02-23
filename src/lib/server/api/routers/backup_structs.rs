#[derive(Serialize, Deserialize, Debug, Clone, JsonSchema, ToSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupSitesListSource {
    pub source: String,
    pub source_type: SitesListSourceType,
    pub format: SitesListFormat,
}

#[derive(Serialize, Deserialize, Debug, Clone, JsonSchema, ToSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupSitesList {
    pub id: uuid::Uuid,
    pub name: String,
    pub description: Option<String>,
    pub sources: Vec<BackupSitesListSource>,
}

#[derive(Serialize, Deserialize, Debug, Clone, JsonSchema, ToSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupScheduleEntry {
    pub start_time: String,
    pub end_time: String,
    pub monday: bool,
    pub tuesday: bool,
    pub wednesday: bool,
    pub thursday: bool,
    pub friday: bool,
    pub saturday: bool,
    pub sunday: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, JsonSchema, ToSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupNetworkBlock {
    pub id: uuid::Uuid,
    pub name: String,
    pub schedules: Vec<BackupScheduleEntry>,
    pub user_rules: Vec<String>,
    pub connected_sites_lists: Vec<uuid::Uuid>,
}

#[derive(Serialize, Deserialize, Debug, Clone, JsonSchema, ToSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EngineBackup {
    pub version: String,
    pub custom_sites_lists: Vec<BackupSitesList>,
    pub network_blocks: Vec<BackupNetworkBlock>,
    pub deactivated_boredom_scripts: Vec<String>,
}
