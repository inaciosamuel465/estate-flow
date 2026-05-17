import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Company, CompanySettings } from '../types';

function getSubdomain(): string | null {
  try {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const params = new URLSearchParams(window.location.search);
      return params.get('__company');
    }

    if (parts.length >= 3) {
      const sub = parts[0];
      if (sub !== 'www' && sub !== 'app') return sub;
    }
    return null;
  } catch {
    return null;
  }
}

function getSlugFromPath(): string | null {
  try {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const first = parts[0];
    if (!first || first === 'master' || first === 'plans' || first === 'login' || first === 'advertise' || first === 'contrato' || first.startsWith('payment')) return null;
    return first;
  } catch {
    return null;
  }
}

interface CompanyContextType {
  company: Company | null;
  companySettings: CompanySettings | null;
  isLoading: boolean;
  isSubscriptionActive: boolean;
  setCurrentCompany: (company: Company, settings: CompanySettings) => void;
  clearCompany: () => void;
  refreshCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export const useCompany = () => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany deve ser usado dentro de <CompanyProvider>');
  return ctx;
};

export const COMPANY_ID_KEY = 'estateflow_company_id';
export const COMPANY_DATA_KEY = 'estateflow_company_data';
export const COMPANY_SETTINGS_KEY = 'estateflow_company_settings';

async function fetchCompany(companyId: string): Promise<{ company: Company | null; settings: CompanySettings | null }> {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(import.meta.env.VITE_DATABASE_URL || '');

    const [companyRows, settingsRows] = await Promise.all([
      sql`SELECT * FROM companies WHERE id = ${companyId} LIMIT 1`,
      sql`SELECT * FROM company_settings WHERE company_id = ${companyId} LIMIT 1`
    ]);

    return {
      company: companyRows.length > 0 ? companyRows[0] as unknown as Company : null,
      settings: settingsRows.length > 0 ? settingsRows[0] as unknown as CompanySettings : null
    };
  } catch (err) {
    console.error('Erro ao carregar empresa:', err);
    return { company: null, settings: null };
  }
}

async function fetchCompanyBySubdomain(subdomain: string): Promise<{ company: Company | null; settings: CompanySettings | null }> {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(import.meta.env.VITE_DATABASE_URL || '');

    const [companyRows, settingsRows] = await Promise.all([
      sql`SELECT * FROM companies WHERE subdomain = ${subdomain} LIMIT 1`,
      sql`SELECT cs.* FROM company_settings cs JOIN companies c ON c.id = cs.company_id WHERE c.subdomain = ${subdomain} LIMIT 1`
    ]);

    return {
      company: companyRows.length > 0 ? companyRows[0] as unknown as Company : null,
      settings: settingsRows.length > 0 ? settingsRows[0] as unknown as CompanySettings : null
    };
  } catch (err) {
    console.error('Erro ao carregar empresa por subdomínio:', err);
    return { company: null, settings: null };
  }
}

async function fetchCompanyBySlug(slug: string): Promise<{ company: Company | null; settings: CompanySettings | null }> {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(import.meta.env.VITE_DATABASE_URL || '');

    const [companyRows, settingsRows] = await Promise.all([
      sql`SELECT * FROM companies WHERE slug = ${slug} LIMIT 1`,
      sql`SELECT cs.* FROM company_settings cs JOIN companies c ON c.id = cs.company_id WHERE c.slug = ${slug} LIMIT 1`
    ]);

    return {
      company: companyRows.length > 0 ? companyRows[0] as unknown as Company : null,
      settings: settingsRows.length > 0 ? settingsRows[0] as unknown as CompanySettings : null
    };
  } catch (err) {
    console.error('Erro ao carregar empresa por slug:', err);
    return { company: null, settings: null };
  }
}

interface Props {
  children: ReactNode;
}

export const CompanyProvider: React.FC<Props> = ({ children }) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSubscriptionActive = company
    ? company.subscription_status === 'active' || company.subscription_status === 'trialing'
    : true;

  const setCurrentCompany = useCallback((c: Company, s: CompanySettings) => {
    setCompany(c);
    setCompanySettings(s);
    localStorage.setItem(COMPANY_DATA_KEY, JSON.stringify(c));
    localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(s));
    if (c.id) localStorage.setItem(COMPANY_ID_KEY, c.id);
    if (c.slug) localStorage.setItem('estateflow_last_slug', c.slug);
  }, []);

  const clearCompany = useCallback(() => {
    setCompany(null);
    setCompanySettings(null);
    localStorage.removeItem(COMPANY_DATA_KEY);
    localStorage.removeItem(COMPANY_SETTINGS_KEY);
    localStorage.removeItem(COMPANY_ID_KEY);
  }, []);

  const refreshCompany = useCallback(async () => {
    const storedId = localStorage.getItem(COMPANY_ID_KEY);
    if (!storedId) {
      setIsLoading(false);
      return;
    }
    const { company: c, settings: s } = await fetchCompany(storedId);
    if (c) setCurrentCompany(c, s || { company_id: c.id });
    setIsLoading(false);
  }, [setCurrentCompany]);

  useEffect(() => {
    const initCompany = async () => {
      const subdomain = getSubdomain();

      // Tenta resolver por subdomínio primeiro
      if (subdomain) {
        const { company: c, settings: s } = await fetchCompanyBySubdomain(subdomain);
        if (c) {
          setCurrentCompany(c, s || { company_id: c.id });
          setIsLoading(false);
          return;
        }
        // Fallback: tenta por slug
        const { company: c2, settings: s2 } = await fetchCompanyBySlug(subdomain);
        if (c2) {
          setCurrentCompany(c2, s2 || { company_id: c2.id });
          setIsLoading(false);
          return;
        }
      }

      // Tenta resolver por slug na URL path (ex: /estate1/dashboard)
      const slugFromPath = getSlugFromPath();
      if (slugFromPath) {
        const { company: c, settings: s } = await fetchCompanyBySlug(slugFromPath);
        if (c) {
          setCurrentCompany(c, s || { company_id: c.id });
          setIsLoading(false);
          return;
        }
      }

      // Fallback: localStorage apenas se chegou aqui sem slug
      const storedId = localStorage.getItem(COMPANY_ID_KEY);
      const storedData = localStorage.getItem(COMPANY_DATA_KEY);
      const storedSettings = localStorage.getItem(COMPANY_SETTINGS_KEY);

      if (storedData) {
        try {
          setCompany(JSON.parse(storedData));
          if (storedSettings) setCompanySettings(JSON.parse(storedSettings));
          setIsLoading(false);
          return;
        } catch {
          // fall through to refreshCompany
        }
      }

      if (storedId) {
        await refreshCompany();
      } else {
        setIsLoading(false);
      }
    };

    initCompany();
  }, [refreshCompany, setCurrentCompany]);

  return (
    <CompanyContext.Provider value={{
      company,
      companySettings,
      isLoading,
      isSubscriptionActive,
      setCurrentCompany,
      clearCompany,
      refreshCompany
    }}>
      {children}
    </CompanyContext.Provider>
  );
};
