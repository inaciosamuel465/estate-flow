import React, { useState } from 'react';

const SaasHome: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: '', admin_name: '', admin_email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const lastTenantSlug = localStorage.getItem('estateflow_last_slug');
  const loginHref = lastTenantSlug ? `/${lastTenantSlug}/login` : '/';

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);
    const slug = form.company_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    try {
      const res = await fetch('/api/agency/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.company_name,
          slug: slug || 'imobiliaria',
          email: form.admin_email,
          phone: form.phone,
          admin_name: form.admin_name,
          admin_email: form.admin_email,
          admin_password: Math.random().toString(36).slice(2),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormMsg({ type: 'success', text: data.message });
        setForm({ company_name: '', admin_name: '', admin_email: '', phone: '' });
      } else {
        setFormMsg({ type: 'error', text: data.error || 'Erro ao enviar' });
      }
    } catch {
      setFormMsg({ type: 'error', text: 'Erro de conexao' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-white font-black text-sm tracking-tight">EF</span>
            </div>
            <span className="font-extrabold text-slate-800 text-lg tracking-tight">EstateFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/master" className="text-sm text-slate-400 hover:text-slate-700 font-semibold px-3 py-2 transition-colors">Master</a>
            <a href={loginHref} className="text-sm text-slate-400 hover:text-slate-700 font-semibold px-3 py-2 transition-colors">Entrar</a>
            <button onClick={() => setShowForm(true)} className="ml-1 px-5 py-2.5 bg-primary hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25 active:scale-[0.97]">
              Criar Imobiliária
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-12 md:pt-16 pb-20 md:pb-28">
        {/* Floating Badge */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100/80 backdrop-blur-sm rounded-full border border-slate-200 shadow-sm">
          <span className="size-5 bg-emerald-500 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm" style={{ fontSize: '14px' }}>check</span>
          </span>
          <span className="text-xs font-bold text-slate-600 tracking-tight whitespace-nowrap">Sistema 100% Online, Seguro e em Nuvem</span>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Column */}
          <div className="flex-1 lg:max-w-[54%]">
            {/* Mobile Badge */}
            <div className="md:hidden flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 rounded-full border border-slate-200 mb-6 w-fit">
              <span className="size-4 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xs" style={{ fontSize: '11px' }}>check</span>
              </span>
              <span className="text-[11px] font-bold text-slate-600">100% Online, Seguro e em Nuvem</span>
            </div>

            <h1 className="text-[2.5rem] md:text-[3.25rem] lg:text-[3.75rem] font-extrabold text-slate-900 leading-[1.08] tracking-tight mb-5">
              Um sistema completo para imobiliárias que querem{' '}
              <span className="text-primary relative">vender mais
                <span className="absolute -bottom-1 left-0 right-0 h-3 bg-blue-100/60 -z-10 rounded-full blur-sm"></span>
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-xl mb-8">
              Gestão de imóveis, clientes, contratos, financeiro e muito mais em um só lugar. Simples, rápido e eficiente.
            </p>

            <div className="flex items-center gap-3 mb-12">
              <button onClick={() => setShowForm(true)} className="px-7 py-3.5 bg-primary hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-xl shadow-primary/25 active:scale-[0.97]">
                Criar Imobiliária
              </button>
              <a href="/plans" className="px-7 py-3.5 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-[0.97]">
                Ver Planos
              </a>
            </div>

            {/* 4 Mini Cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: 'verified', title: 'Seguro', desc: 'Dados protegidos com criptografia de ponta a ponta', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
                { icon: 'cloud', title: '100% Online', desc: 'Acesse de qualquer lugar, a qualquer momento', iconBg: 'bg-teal-50', iconColor: 'text-teal-600' },
                { icon: 'tune', title: 'Mais Controle', desc: 'Painel completo com indicadores em tempo real', iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
                { icon: 'support_agent', title: 'Suporte', desc: 'Equipe especializada sempre pronta para ajudar', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 group">
                  <div className={`size-10 rounded-xl ${item.iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <span className={`material-symbols-outlined text-xl ${item.iconColor}`}>{item.icon}</span>
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm mb-0.5">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column — Device Mockups */}
          <div className="flex-1 lg:max-w-[46%] w-full perspective-3d relative">
            <div className="relative w-full" style={{ paddingBottom: '68%' }}>
              {/* Notebook */}
              <div className="absolute inset-0" style={{ transform: 'rotateY(-3deg) rotateX(2deg)' }}>
                <div className="relative w-full h-full">
                  {/* Screen bezel */}
                  <div className="absolute inset-0 bg-slate-200 rounded-[14px] shadow-premium border border-slate-300 overflow-hidden">
                    {/* Webcam */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 size-1.5 bg-slate-400 rounded-full"></div>

                    {/* Screen content */}
                    <div className="absolute inset-[3px] bg-white rounded-[11px] overflow-hidden notebook-screen-content">
                      {/* Dashboard Interno */}
                      <div className="flex h-full">
                        {/* Sidebar */}
                        <div className="w-12 bg-slate-900 flex flex-col items-center py-3 gap-3 shrink-0">
                          <div className="size-5 bg-primary rounded-md flex items-center justify-center">
                            <span className="text-white text-[9px] font-black">EF</span>
                          </div>
                          <div className="size-5 bg-slate-700/50 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '13px' }}>dashboard</span>
                          </div>
                          <div className="size-5 bg-slate-700/50 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '13px' }}>inventory_2</span>
                          </div>
                          <div className="size-5 bg-slate-700/50 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '13px' }}>groups</span>
                          </div>
                          <div className="size-5 bg-slate-700/50 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '13px' }}>payments</span>
                          </div>
                          <div className="size-5 bg-slate-700/50 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '13px' }}>campaign</span>
                          </div>
                          <div className="mt-auto size-5 bg-slate-700/50 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '13px' }}>settings</span>
                          </div>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 flex flex-col p-2.5 gap-2 overflow-hidden">
                          {/* Top bar */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[9px] font-black text-slate-800 tracking-tight">Dashboard</p>
                              <p className="text-[7px] text-slate-400">Resumo do mês</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="size-4 bg-slate-100 rounded flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '9px' }}>search</span>
                              </div>
                              <div className="size-4 bg-slate-100 rounded flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '9px' }}>notifications</span>
                              </div>
                              <div className="size-4 bg-primary/20 rounded-full flex items-center justify-center">
                                <span className="text-[6px] font-black text-primary">M</span>
                              </div>
                            </div>
                          </div>

                          {/* Stats cards */}
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { label: 'Imóveis', value: '142', color: 'bg-blue-500', light: 'bg-blue-50' },
                              { label: 'Views', value: '8.5k', color: 'bg-purple-500', light: 'bg-purple-50' },
                              { label: 'Leads', value: '423', color: 'bg-amber-500', light: 'bg-amber-50' },
                              { label: 'Receita', value: 'R$ 2.4M', color: 'bg-emerald-500', light: 'bg-emerald-50' },
                            ].map((stat, i) => (
                              <div key={i} className={`${stat.light} rounded-lg p-2`}>
                                <p className="text-[6px] text-slate-500 font-semibold mb-0.5">{stat.label}</p>
                                <p className="text-[11px] font-black text-slate-900">{stat.value}</p>
                                <div className="flex items-center gap-0.5 mt-0.5">
                                  <span className="material-symbols-outlined text-emerald-500" style={{ fontSize: '6px' }}>trending_up</span>
                                  <span className="text-[6px] text-emerald-600 font-bold">+12%</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Chart area */}
                          <div className="flex gap-1.5 flex-1 min-h-0">
                            <div className="flex-1 bg-slate-50 rounded-lg p-2 flex flex-col">
                              <p className="text-[7px] font-bold text-slate-600 mb-1.5">Desempenho</p>
                              <div className="flex-1 flex items-end gap-1">
                                {[35, 55, 42, 78, 62, 90, 75, 85, 60, 45, 70, 95].map((h, i) => (
                                  <div key={i} className="flex-1 bg-primary/20 rounded-t-sm relative overflow-hidden" style={{ height: `${h}%` }}>
                                    <div className="absolute bottom-0 inset-x-0 bg-primary rounded-t-sm" style={{ height: '60%' }}></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="w-20 bg-indigo-50 rounded-lg p-2 flex flex-col">
                              <p className="text-[7px] font-bold text-indigo-600 mb-1">Leads</p>
                              <p className="text-[16px] font-black text-indigo-600 leading-none">423</p>
                              <p className="text-[6px] text-indigo-400 mt-auto">+23% esse mês</p>
                            </div>
                          </div>

                          {/* Activity table */}
                          <div className="bg-slate-50 rounded-lg p-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[7px] font-bold text-slate-600">Atividades</p>
                              <span className="text-[6px] text-primary font-bold">Ver todas</span>
                            </div>
                            {[
                              { action: 'Imóvel Alugado', entity: 'Apt. Luxo 42', status: 'Concluído', color: 'bg-emerald-500' },
                              { action: 'Contrato Criado', entity: 'Casa Centro', status: 'Pendente', color: 'bg-amber-500' },
                              { action: 'Lead Convertido', entity: 'Maria Silva', status: 'Concluído', color: 'bg-emerald-500' },
                            ].map((row, i) => (
                              <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                                <div className="flex items-center gap-1.5">
                                  <div className={`size-1.5 ${row.color} rounded-full`}></div>
                                  <p className="text-[7px] text-slate-700 font-semibold">{row.action}</p>
                                </div>
                                <p className="text-[6px] text-slate-400">{row.entity}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Notebook base shadow */}
                  <div className="absolute -bottom-2 left-[10%] right-[10%] h-3 bg-slate-300/50 rounded-full blur-sm"></div>
                </div>
              </div>

              {/* Smartphone */}
              <div className="absolute phone-float" style={{ bottom: '-5%', right: '-4%', width: '38%', zIndex: 20 }}>
                <div className="relative w-full" style={{ paddingBottom: '200%' }}>
                  {/* Phone body */}
                  <div className="absolute inset-0 bg-slate-800 rounded-[20px] shadow-2xl border-2 border-slate-700 overflow-hidden">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-slate-900 rounded-b-xl z-10 flex items-center justify-center gap-1.5">
                      <div className="size-1 bg-slate-600 rounded-full"></div>
                      <div className="w-4 h-1 bg-slate-700 rounded-full"></div>
                    </div>

                    {/* Phone screen */}
                    <div className="absolute inset-[3px] bg-white rounded-[17px] overflow-hidden">
                      {/* Status bar */}
                      <div className="flex items-center justify-between px-4 pt-3 pb-1">
                        <span className="text-[7px] font-bold text-slate-800">9:41</span>
                        <div className="flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-slate-600" style={{ fontSize: '8px' }}>signal_cellular_alt</span>
                          <span className="material-symbols-outlined text-slate-600" style={{ fontSize: '8px' }}>wifi</span>
                          <span className="text-[7px] font-bold text-slate-800">🔋</span>
                        </div>
                      </div>

                      {/* App header */}
                      <div className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-slate-600" style={{ fontSize: '10px' }}>arrow_back</span>
                          <span className="text-[9px] font-black text-slate-800">Imóveis</span>
                        </div>
                        <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '10px' }}>tune</span>
                      </div>

                      {/* Property cards */}
                      <div className="px-3 space-y-2 mt-1">
                        {[
                          { title: 'Apt. Vista Mar', price: 'R$ 850.000', type: 'Alugar', gradient: 'from-blue-400 to-indigo-500', icon: 'apartment' },
                          { title: 'Casa Centro', price: 'R$ 1.200.000', type: 'Comprar', gradient: 'from-emerald-400 to-teal-500', icon: 'house' },
                        ].map((prop, i) => (
                          <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Thumbnail */}
                            <div className={`h-14 bg-gradient-to-br ${prop.gradient} flex items-center justify-center relative overflow-hidden`}>
                              <div className="absolute inset-0 bg-white/10"></div>
                              <span className="material-symbols-outlined text-white/70" style={{ fontSize: '22px' }}>{prop.icon}</span>
                              <span className="absolute top-1.5 right-1.5 text-[7px] bg-white/90 text-slate-800 font-bold px-1.5 py-0.5 rounded-full">Foto</span>
                            </div>
                            {/* Info */}
                            <div className="p-2 flex items-center justify-between">
                              <div>
                                <p className="text-[8px] font-bold text-slate-800">{prop.title}</p>
                                <p className="text-[9px] font-black text-primary">{prop.price}</p>
                              </div>
                              <div className="px-2.5 py-1 bg-primary rounded-md shadow-sm">
                                <span className="text-[7px] font-black text-white">{prop.type}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bottom nav */}
                      <div className="absolute bottom-0 inset-x-0 flex items-center justify-around py-1.5 border-t border-slate-100 bg-white">
                        {['home', 'search', 'favorite', 'person'].map((icon, i) => (
                          <span key={i} className={`material-symbols-outlined ${i === 0 ? 'text-primary' : 'text-slate-300'}`} style={{ fontSize: '11px' }}>{icon}</span>
                        ))}
                      </div>

                      {/* Home indicator */}
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-300 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="bg-slate-50 py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 mb-5">
            <span className="material-symbols-outlined text-primary text-sm">rocket_launch</span>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Processo</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">Como funciona</h2>
          <p className="text-slate-500 text-base md:text-lg max-w-xl mx-auto mb-16">Simples, rápido e eficiente em 4 passos</p>

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-0">
            <div className="step-line hidden md:block"></div>
            {[
              { num: '01', title: 'Cadastre sua imobiliária', desc: 'Preencha seus dados em menos de 2 minutos', icon: 'how_to_reg' },
              { num: '02', title: 'Configure seu sistema', desc: 'Personalize cores, logo e preferências', icon: 'tune' },
              { num: '03', title: 'Convide sua equipe', desc: 'Adicione corretores e colaboradores', icon: 'group_add' },
              { num: '04', title: 'Comece a vender mais', desc: 'Publique imóveis e acompanhe resultados', icon: 'trending_up' },
            ].map((step, i) => (
              <div key={i} className="relative flex flex-col items-center md:px-6">
                <div className="size-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-5 relative z-10">
                  <span className="text-white font-black text-lg">{step.num}</span>
                </div>
                <h3 className="font-extrabold text-slate-800 text-base mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Dark Bar */}
      <section className="bar-gradient py-14 md:py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-0">
            {[
              { icon: 'timer', title: 'Economize tempo', desc: 'Automatize tarefas repetitivas' },
              { icon: 'trending_down', title: 'Reduza custos', desc: 'Menos papel, mais eficiência' },
              { icon: 'trending_up', title: 'Aumente vendas', desc: 'Feche negócios mais rápido' },
              { icon: 'lock', title: 'Dados seguros', desc: 'Criptografia e backup diário' },
              { icon: 'face', title: 'Suporte humanizado', desc: 'Equipe pronta para ajudar' },
            ].map((item, i) => (
              <div key={i} className={`flex flex-col items-center text-center md:px-6 ${i < 4 ? 'md:border-r border-slate-700/50' : ''}`}>
                <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-primary text-2xl">{item.icon}</span>
                </div>
                <h3 className="text-white font-extrabold text-base mb-1">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 md:py-16 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="size-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-emerald-500 text-3xl">verified</span>
          </div>
          <p className="text-slate-700 text-lg md:text-xl font-bold leading-relaxed">
            Mais de 100 imobiliárias já confiam no nosso sistema para crescer com segurança e profissionalismo.
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-400 flex-wrap">
            <span>EstateFlow Suite</span>
            <span className="size-1 bg-slate-300 rounded-full"></span>
            <span>© {new Date().getFullYear()}</span>
            <span className="size-1 bg-slate-300 rounded-full"></span>
            <span>Todos os direitos reservados</span>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (!submitting) setShowForm(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-extrabold text-lg text-slate-800">Solicitar Imobiliária</h2>
                <p className="text-sm text-slate-400">Preencha seus dados para começar</p>
              </div>
              <button onClick={() => setShowForm(false)} className="size-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 pt-4 space-y-4">
              {formMsg && (
                <div className={`px-4 py-3.5 rounded-xl text-sm font-medium ${
                  formMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-lg ${formMsg.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formMsg.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {formMsg.text}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nome da Imobiliária</label>
                  <input placeholder="Ex: Imobiliária Alpha" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Seu Nome</label>
                  <input placeholder="Ex: João Silva" value={form.admin_name} onChange={e => setForm(p => ({ ...p, admin_name: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email para Contato</label>
                  <input type="email" placeholder="seu@email.com" value={form.admin_email} onChange={e => setForm(p => ({ ...p, admin_email: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Telefone</label>
                  <input placeholder="(15) 99999-9999" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all" />
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-4 bg-primary hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-[0.98]">
                {submitting ? (
                  <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">send</span>
                    Solicitar Abertura
                  </>
                )}
              </button>

              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Após enviar, o administrador master analisará sua solicitação. Você receberá um email com as instruções de acesso.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaasHome;
