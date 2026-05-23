import { Github, X } from 'lucide-react';
import type { GitRepository } from '@/api-types';

interface RepositoryInfoBannerProps {
    repository: GitRepository | null;
    onClear?: () => void;
}

export function RepositoryInfoBanner({ repository, onClear }: RepositoryInfoBannerProps) {
    if (!repository) return null;

    return (
        <div className="bg-linear-to-r from-accent/10 to-accent/5 border-b border-accent/30 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Github className="size-4 text-accent shrink-0" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text-primary truncate">
                                {repository.owner.name}/{repository.name}
                            </p>
                            {repository.isPrivate && (
                                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-600 text-xs rounded shrink-0">
                                    Private
                                </span>
                            )}
                        </div>
                        {repository.description && (
                            <p className="text-xs text-text-secondary truncate mt-0.5">
                                {repository.description}
                            </p>
                        )}
                    </div>
                </div>
                {onClear && (
                    <button
                        onClick={onClear}
                        className="p-1 hover:bg-bg-2 rounded transition-colors shrink-0"
                        title="Clear repository"
                    >
                        <X className="size-4 text-text-tertiary hover:text-text-secondary" />
                    </button>
                )}
            </div>
        </div>
    );
}
