import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export function useApi(url, options = {}) {
  const { immediate = true, deps = [], initialData = null } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url, { params });
      setData(res.data.data);
      return res.data.data;
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Something went wrong');
      return null;
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (immediate && url) fetch();
  }, [url, immediate, ...deps]);

  return { data, loading, error, refetch: fetch };
}

export function useListQuery(url, options = {}) {
  return useApi(url, { initialData: [], ...options });
}

export const useQuery = useListQuery;

export function useMutation(method = 'post', defaultUrl = null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = async (urlOrPayload, payload) => {
    setLoading(true);
    setError(null);
    try {
      const url = payload === undefined ? defaultUrl : urlOrPayload;
      const body = payload === undefined ? urlOrPayload : payload;
      if (!url) throw new Error('Mutation URL is required');

      const res = await api[method](url, body);
      return { data: res.data.data, success: true };
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Something went wrong';
      setError(msg);
      return { error: msg, success: false };
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
