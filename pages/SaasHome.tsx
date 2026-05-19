import React, { useEffect, useMemo, useState } from 'react';
import { Button, EmptyState, Field, Modal, SectionHeader } from '../components/ui';

interface VisibleCompany {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  hero_video_url?: string;
}

const slugify = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const modules = [
  { icon: 'home_work', title: 'Imoveis', desc: 'Cadastro, fotos, status, proprietarios e publicacao por tenant.' },
  { icon: 'groups', title: 'CRM', desc: 'Leads, clientes, historico, score e distribuicao para equipe.' },
  { icon: 'contract', title: 'Contratos', desc: 'Modelos, assinatura digital, timeline e PDF profissional.' },
  { icon: 'payments', title: 'Cobrancas', desc: 'PIX, Mercado Pago, repasses, vencimentos e inadimplencia.' },
  { icon: 'campaign', title: 'Marketing', desc: 'Artes, textos, campanhas e historico por imobiliaria.' },
  { icon: 'notifications_active', title: 'Alertas', desc: 'Email, push e automacoes para eventos importantes.' },
];

const SaasHome: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    slug: '',
    cnpj: '',
    admin_name: '',
    admin_email: '',
    phone: '',
    accepted: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [companies, setCompanies] = useState<VisibleCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  const lastTenantSlug = localStorage.getItem('estateflow_last_slug');
  const loginHref = lastTenantSlug ? `/${lastTenantSlug}/login` : '/';
  const suggestedSlug = useMemo(() => form.slug || slugify(form.company_name), [form.company_name, form.slug]);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
        const rows = await sql`
          SELECT c.id, c.name, c.slug, c.logo_url, c.primary_color, cs.hero_video_url
          FROM companies c
          LEFT JOIN company_settings cs ON cs.company_id = c.id
          WHERE c.visible = true AND c.status = 'active'
          ORDER BY c.name ASC
        `;
        setCompanies(rows as unknown as VisibleCompany[]);
      } catch (err) {
        console.error('Erro ao carregar imobiliarias:', err);
      } finally {
        setCompaniesLoading(false);
      }
    };
    loadCompanies();
  }, []);

  const updateForm = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormMsg(null);

    const finalSlug = slugify(suggestedSlug);
    if (!finalSlug) {
      setFormMsg({ type: 'error', text: 'Informe um slug valido para a URL da imobiliaria.' });
      return;
    }
    if (!form.accepted) {
      setFormMsg({ type: 'error', text: 'Confirme que voce tem autorizacao para criar esta imobiliaria.' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/agency/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.company_name,
          slug: finalSlug,
          cnpj: form.cnpj,
          email: form.admin_email,
          phone: form.phone,
          admin_name: form.admin_name,
          admin_email: form.admin_email,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setFormMsg({ type: 'error', text: data.error || 'Nao foi possivel enviar a solicitacao.' });
        return;
      }
      setFormMsg({ type: 'success', text: data.message || 'Solicitacao enviada. O master analisara e enviara o convite de ativacao.' });
      setForm({ company_name: '', slug: '', cnpj: '', admin_name: '', admin_email: '', phone: '', accepted: false });
    } catch {
      setFormMsg({ type: 'error', text: 'Erro de conexao ao enviar a solicitacao.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm">EF</div>
            <span className="truncate text-lg font-black tracking-tight text-slate-900">EstateFlow</span>
          </a>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <a href="/master" className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">Master</a>
              <a href={loginHref} className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">Entrar</a>
            </div>
            <Button type="button" icon="domain_add" className="w-full sm:w-auto" onClick={() => setShowForm(true)}>
              Criar Imobiliaria
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <div className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-black uppercase tracking-wide text-emerald-700">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              SaaS imobiliario tenant-first
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Plataforma completa para vender, alugar, assinar e cobrar.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">
              Cada imobiliaria com sua propria URL, identidade, usuarios, contratos, cobrancas, leads, marketing e operacao financeira. Minimalista por fora, robusto por dentro.
            </p>
            <div className="mt-8 grid gap-3 sm:flex">
              <Button type="button" icon="rocket_launch" className="w-full sm:w-auto" onClick={() => setShowForm(true)}>
                Criar Imobiliaria
              </Button>
              <a href="/plans" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto">
                Ver Planos
              </a>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              {[
                ['multi-tenant', 'URLs isoladas'],
                ['financeiro', 'Cobrancas reais'],
                ['contratos', 'Assinatura digital'],
              ].map(([label, desc]) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-900">{label}</p>
                  <p className="mt-1 text-xs leading-tight text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-4 shadow-2xl shadow-slate-300/40">
            <div className="rounded-[1.4rem] bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Painel da imobiliaria</p>
                  <h2 className="font-black text-slate-950">Operacao em tempo real</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">online</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Imoveis ativos', '142', 'home_work'],
                  ['Leads no mes', '423', 'groups'],
                  ['Contratos', '38', 'contract'],
                  ['Receita', 'R$ 2.4M', 'payments'],
                ].map(([label, value, icon]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-4">
                    <span className="material-symbols-outlined text-slate-400">{icon}</span>
                    <p className="mt-3 text-xs font-bold text-slate-400">{label}</p>
                    <p className="text-2xl font-black text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border border-slate-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black">Automacoes</p>
                  <span className="text-xs font-bold text-primary">6 ativas</span>
                </div>
                {['Novo lead recebido', 'Contrato enviado para assinatura', 'Cobranca vence em 3 dias'].map(item => (
                  <div key={item} className="flex items-center gap-3 border-t border-slate-100 py-2 first:border-t-0">
                    <span className="size-2 rounded-full bg-primary" />
                    <span className="text-sm font-semibold text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50 px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Modulos essenciais"
              title="Tudo que a imobiliaria precisa, separado por tenant"
              description="A base foi pensada para vender o SaaS sem depender de processos manuais: contratos, cobrancas, leads, email, push e marketing convivem no mesmo fluxo."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map(module => (
                <div key={module.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <span className="material-symbols-outlined text-2xl text-slate-900">{module.icon}</span>
                  <h3 className="mt-4 font-black text-slate-950">{module.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{module.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeader
            eyebrow="Clientes"
            title="Imobiliarias em operacao"
            description="Cada ambiente tem URL propria, dados isolados, identidade visual e administracao independente."
          />
          {companiesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : companies.length === 0 ? (
            <EmptyState icon="domain_disabled" title="Nenhuma imobiliaria publicada" description="Quando uma imobiliaria for aprovada no master, ela aparecera aqui automaticamente." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map(company => {
                const color = company.primary_color || '#0f172a';
                return (
                  <a key={company.id} href={`/${company.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex items-center gap-3">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="size-12 rounded-xl border border-slate-100 object-contain p-1" />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-xl text-lg font-black text-white" style={{ backgroundColor: color }}>
                          {company.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="truncate font-black text-slate-950">{company.name}</h3>
                        <p className="truncate text-sm font-semibold text-slate-400">/{company.slug}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-4 text-sm font-black text-slate-700">
                      Acessar site
                      <span className="material-symbols-outlined transition group-hover:translate-x-1">arrow_forward</span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-100 px-4 py-10 text-center text-sm font-semibold text-slate-400">
        EstateFlow Suite - {new Date().getFullYear()} - SaaS imobiliario multi-tenant.
      </footer>

      <Modal
        open={showForm}
        title="Criar uma nova imobiliaria"
        description="Solicite o ambiente da imobiliaria. O master aprova e envia um convite seguro para o admin definir a senha."
        onClose={() => { if (!submitting) setShowForm(false); }}
        widthClass="max-w-3xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5 p-5">
          {formMsg && (
            <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${formMsg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {formMsg.text}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome da imobiliaria" required value={form.company_name} onChange={event => updateForm({ company_name: event.target.value })} placeholder="Ex: Prime Estate" />
            <Field
              label="URL desejada"
              required
              value={suggestedSlug}
              onChange={event => updateForm({ slug: slugify(event.target.value) })}
              placeholder="prime-estate"
              hint={`Seu acesso ficara em /${suggestedSlug || 'sua-imobiliaria'}`}
            />
            <Field label="Responsavel admin" required value={form.admin_name} onChange={event => updateForm({ admin_name: event.target.value })} placeholder="Nome completo" />
            <Field label="Email do admin" required type="email" value={form.admin_email} onChange={event => updateForm({ admin_email: event.target.value })} placeholder="admin@imobiliaria.com" />
            <Field label="Telefone / WhatsApp" value={form.phone} onChange={event => updateForm({ phone: event.target.value })} placeholder="(11) 99999-9999" />
            <Field label="CNPJ opcional" value={form.cnpj} onChange={event => updateForm({ cnpj: event.target.value })} placeholder="00.000.000/0001-00" />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
            <input type="checkbox" checked={form.accepted} onChange={event => updateForm({ accepted: event.target.checked })} className="mt-1 size-4 rounded border-slate-300" />
            <span>Confirmo que tenho autorizacao para solicitar a criacao deste ambiente e entendo que o acesso inicial sera enviado por convite seguro.</span>
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)} disabled={submitting} className="w-full sm:w-auto">Cancelar</Button>
            <Button type="submit" icon={submitting ? undefined : 'send'} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Enviando...' : 'Solicitar criacao'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SaasHome;

