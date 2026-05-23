import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { GitRepository } from '@/api-types';

export interface UseGitRepositoriesReturn {
    repositories: GitRepository[];
    loading: boolean;
    error: string | null;
    selectedRepo: GitRepository | null;
    selectRepository: (repo: GitRepository) => void;
    clearSelection: () => void;
    refetch: () => Promise<void>;
}

/**
 * Hook for managing user's Git repositories
 * Fetches and manages the list of connected repositories
 */
export function useGitRepositories(): UseGitRepositoriesReturn {
    const [repositories, setRepositories] = useState<GitRepository[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRepo, setSelectedRepo] = useState<GitRepository | null>(null);

    const fetchRepositories = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.getUserGitRepositories();
            
            if (response.success && response.data) {
                setRepositories(response.data.repositories);
            } else {
                setError(response.error?.message || 'Failed to fetch repositories');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repositories';
            setError(errorMessage);
            console.error('Error fetching Git repositories:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const selectRepository = useCallback((repo: GitRepository) => {
        setSelectedRepo(repo);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedRepo(null);
    }, []);

    // Load repositories on mount
    useEffect(() => {
        fetchRepositories();
    }, [fetchRepositories]);

    return {
        repositories,
        loading,
        error,
        selectedRepo,
        selectRepository,
        clearSelection,
        refetch: fetchRepositories,
    };
}
