import { useState, useCallback } from 'react';
import { ChevronDown, Github, Loader, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useGitRepositories } from '@/hooks/use-git-repositories';
import type { GitRepository } from '@/api-types';

interface GitRepositorySelectorProps {
    onRepositorySelect?: (repository: GitRepository) => void;
    selectedRepository?: GitRepository | null;
    compact?: boolean;
}

export function GitRepositorySelector({
    onRepositorySelect,
    selectedRepository,
    compact = false,
}: GitRepositorySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { repositories, loading, error, selectRepository } = useGitRepositories();

    const handleSelectRepository = useCallback(
        (repo: GitRepository) => {
            selectRepository(repo);
            onRepositorySelect?.(repo);
            setIsOpen(false);
            setSearchTerm('');
        },
        [selectRepository, onRepositorySelect]
    );

    const filteredRepositories = repositories.filter((repo) =>
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.owner.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (compact && !selectedRepository) {
        return null;
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-md border',
                    'transition-colors duration-200',
                    selectedRepository
                        ? 'bg-bg-2 border-accent text-accent hover:bg-bg-3'
                        : 'bg-bg-1 border-border-primary text-text-secondary hover:border-accent hover:text-accent'
                )}
            >
                <Github className="size-4" />
                <span className="truncate text-sm font-medium">
                    {selectedRepository ? `${selectedRepository.owner.name}/${selectedRepository.name}` : 'Select Repository'}
                </span>
                <ChevronDown className={clsx('size-4 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {isOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-bg-1 border border-border-primary rounded-lg shadow-lg">
                    {/* Search Input */}
                    <div className="p-3 border-b border-border-primary">
                        <input
                            type="text"
                            placeholder="Search repositories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 bg-bg-2 border border-border-primary rounded text-text-primary placeholder-text-tertiary text-sm focus:outline-none focus:border-accent"
                        />
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="p-8 flex flex-col items-center justify-center gap-2">
                            <Loader className="size-5 animate-spin text-accent" />
                            <span className="text-sm text-text-secondary">Loading repositories...</span>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="p-4 flex gap-2 items-start bg-red-500/10">
                            <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-red-500 font-medium">Error loading repositories</p>
                                <p className="text-xs text-red-500/70">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && filteredRepositories.length === 0 && (
                        <div className="p-8 text-center">
                            <p className="text-sm text-text-secondary">
                                {searchTerm ? 'No repositories found' : 'No repositories connected'}
                            </p>
                            {!searchTerm && (
                                <p className="text-xs text-text-tertiary mt-1">
                                    Connect your GitHub account to see your repositories
                                </p>
                            )}
                        </div>
                    )}

                    {/* Repository List */}
                    {!loading && !error && filteredRepositories.length > 0 && (
                        <div className="max-h-64 overflow-y-auto">
                            {filteredRepositories.map((repo) => (
                                <button
                                    key={repo.id}
                                    onClick={() => handleSelectRepository(repo)}
                                    className={clsx(
                                        'w-full px-4 py-3 text-left border-b border-border-primary last:border-b-0',
                                        'transition-colors duration-150 hover:bg-bg-2',
                                        selectedRepository?.id === repo.id && 'bg-accent/10'
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-text-primary truncate">
                                                    {repo.owner.name}/{repo.name}
                                                </p>
                                                {repo.isPrivate && (
                                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-600 text-xs rounded">
                                                        Private
                                                    </span>
                                                )}
                                            </div>
                                            {repo.description && (
                                                <p className="text-xs text-text-secondary mt-1 truncate">
                                                    {repo.description}
                                                </p>
                                            )}
                                            {repo.language && (
                                                <p className="text-xs text-text-tertiary mt-1">
                                                    {repo.language}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
