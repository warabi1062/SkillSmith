// プラグインの名前と説明をread-onlyで表示するセクション

interface PluginActionsSectionProps {
  plugin: { name: string; description: string | null };
}

export default function PluginActionsSection({
  plugin,
}: PluginActionsSectionProps) {
  return (
    <div className="detail-header">
      <div>
        <h2>{plugin.name}</h2>
        {plugin.description && (
          <p className="card-description">{plugin.description}</p>
        )}
      </div>
    </div>
  );
}
