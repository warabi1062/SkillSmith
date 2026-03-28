// プラグインの名前と説明をread-onlyで表示するセクション

interface PluginActionsSectionProps {
  plugin: { name: string; description: string | null };
}

export default function PluginActionsSection({ plugin }: PluginActionsSectionProps) {
  return (
    <div className="flex items-start mb-6">
      <div>
        <h2 className="mb-1">{plugin.name}</h2>
        {plugin.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{plugin.description}</p>
        )}
      </div>
    </div>
  );
}
