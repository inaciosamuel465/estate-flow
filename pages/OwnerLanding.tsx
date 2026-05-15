import React, { useState } from 'react';

interface OwnerLandingProps {
    onBack: () => void;
}

const OwnerLanding: React.FC<OwnerLandingProps> = ({ onBack }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        propertyType: 'Apartamento',
        goal: 'Vender'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulação de envio
        setTimeout(() => {
            setIsSubmitting(false);
            setSuccess(true);
        }, 1500);
    };

    const handleWhatsapp = () => {
        window.open("https://wa.me/5515997241175?text=Olá,%20gostaria%20de%20anunciar%20meu%20imóvel!", "_blank");
    };

    return (
        <div className="min-h-screen bg-white font-display text-slate-900">

            {/* --- Header Simplificado --- */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                        <div className="size-10 bg-gradient-to-br from-primary to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                            <span className="material-symbols-outlined text-2xl">roofing</span>
                        </div>
                        <span className="text-xl font-bold text-slate-900 tracking-tight">EstateFlow</span>
                    </div>
                    <button onClick={onBack} className="text-slate-600 hover:text-primary font-bold text-sm flex items-center gap-1">
                        <span className="material-symbols-outlined">arrow_back</span> Voltar para Home
                    </button>
                </div>
            </header>

            <main>
                {/* --- Hero Section com Formulário --- */}
                <section className="relative py-16 lg:py-24 px-4 overflow-hidden bg-slate-900">
                    {/* Background Image Darkened */}
                    <div className="absolute inset-0 z-0">
                        <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop" className="w-full h-full object-cover opacity-40" alt="Interior Luxury" />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
                    </div>

                    <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                        {/* Texto Hero */}
                        <div className="text-white space-y-6 animate-in fade-in slide-in-from-left-4 duration-700">
                            <span className="inline-block px-3 py-1 bg-primary/20 border border-primary/50 rounded-full text-primary-300 text-xs font-bold uppercase tracking-wider">
                                Para Proprietários
                            </span>
                            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
                                Valorize seu patrimônio. <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Venda ou alugue rápido.</span>
                            </h1>
                            <p className="text-slate-300 text-lg max-w-lg leading-relaxed">
                                Conectamos seu imóvel aos clientes ideais usando inteligência artificial e marketing de alta performance. Sem burocracia, com total transparência.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    onClick={handleWhatsapp}
                                    className="flex items-center justify-center gap-2 px-8 py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-lg shadow-lg shadow-green-900/20 transition-all transform hover:-translate-y-1"
                                >
                                    <span className="material-symbols-outlined text-[24px]">chat</span>
                                    Falar no WhatsApp
                                </button>
                                <div className="flex items-center gap-2 text-slate-400 text-sm px-4">
                                    <span className="material-symbols-outlined text-yellow-400">star</span>
                                    <span>+5.000 proprietários satisfeitos</span>
                                </div>
                            </div>
                        </div>

                        {/* Formulário de Captura */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/30 animate-in fade-in zoom-in duration-700 delay-100">
                            {success ? (
                                <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="size-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 animate-bounce">
                                        <span className="material-symbols-outlined text-4xl">check_circle</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900">Sucesso!</h3>
                                    <p className="text-slate-500 max-w-xs">Recebemos seus dados. Um de nossos especialistas entrará em contato em até 30 minutos.</p>
                                    <button
                                        onClick={() => setSuccess(false)}
                                        className="mt-4 text-primary font-bold hover:underline"
                                    >
                                        Enviar outro imóvel
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="mb-2">
                                        <h3 className="text-xl font-bold text-slate-900">Cadastre seu Imóvel</h3>
                                        <p className="text-slate-500 text-sm">Preencha para receber uma avaliação gratuita.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700">Objetivo</label>
                                            <select
                                                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm focus:ring-primary focus:border-primary"
                                                value={formData.goal}
                                                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                                            >
                                                <option>Vender</option>
                                                <option>Alugar</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700">Tipo</label>
                                            <select
                                                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm focus:ring-primary focus:border-primary"
                                                value={formData.propertyType}
                                                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                                            >
                                                <option>Apartamento</option>
                                                <option>Casa</option>
                                                <option>Cobertura</option>
                                                <option>Comercial</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">Nome Completo</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm focus:ring-primary focus:border-primary"
                                            placeholder="Seu nome"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">Telefone / WhatsApp</label>
                                        <input
                                            type="tel"
                                            required
                                            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm focus:ring-primary focus:border-primary"
                                            placeholder="(00) 00000-0000"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4"
                                    >
                                        {isSubmitting ? (
                                            <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        ) : (
                                            <>
                                                <span>Solicitar Avaliação</span>
                                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                            </>
                                        )}
                                    </button>
                                    <p className="text-xs text-center text-slate-400 mt-2">
                                        Ao enviar, você concorda com nossos <span className="underline cursor-pointer hover:text-primary">Termos de Uso</span>.
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>
                </section>

                {/* --- Como Funciona (Steps) --- */}
                <section className="py-20 px-4 bg-slate-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900">Como funciona o processo?</h2>
                            <p className="text-slate-500 mt-2">Simplificamos a burocracia para você focar no que importa.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            {[
                                { icon: 'app_registration', title: '1. Cadastro Rápido', desc: 'Preencha o formulário acima. Nossa IA faz uma pré-análise da região.' },
                                { icon: 'camera_indoor', title: '2. Produção', desc: 'Agendamos fotos profissionais e tour virtual 3D do seu imóvel.' },
                                { icon: 'campaign', title: '3. Divulgação', desc: 'Anunciamos nos maiores portais e para nossa base de clientes VIP.' },
                                { icon: 'verified', title: '4. Negócio Fechado', desc: 'Assessoria jurídica completa até a entrega das chaves.' }
                            ].map((step, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 -mt-4 -mr-4 size-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                                    <div className="size-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4 text-3xl">
                                        <span className="material-symbols-outlined">{step.icon}</span>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-900 mb-2">{step.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- FAQ / Termos --- */}
                <section className="py-20 px-4 bg-white">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Dúvidas Frequentes</h2>

                        <div className="space-y-4">
                            {[
                                { q: "Quais são as taxas de corretagem?", a: "Para venda, trabalhamos com a taxa padrão de mercado de 6%. Para aluguel, cobramos o primeiro aluguel e 8% mensais pela administração completa." },
                                { q: "Preciso de exclusividade?", a: "Não exigimos exclusividade, mas imóveis exclusivos recebem destaque premium, fotos profissionais gratuitas e impulsionamento pago em redes sociais." },
                                { q: "Como funciona a avaliação do imóvel?", a: "Utilizamos uma ferramenta proprietária de IA que cruza dados de 50.000 imóveis similares na região para sugerir o preço ideal de liquidez." },
                                { q: "Quais documentos são necessários?", a: "Inicialmente, apenas matrícula atualizada e IPTU. Nossa equipe jurídica orientará sobre as certidões negativas no momento da proposta." }
                            ].map((item, idx) => (
                                <details key={idx} className="group bg-slate-50 rounded-xl overflow-hidden cursor-pointer border border-slate-200">
                                    <summary className="flex items-center justify-between p-5 font-bold text-slate-700 hover:text-primary transition-colors list-none select-none">
                                        {item.q}
                                        <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
                                    </summary>
                                    <div className="px-5 pb-5 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-4">
                                        {item.a}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- Footer CTA --- */}
                <section className="bg-primary text-white py-16 px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">Ainda tem dúvidas?</h2>
                    <p className="text-blue-100 mb-8 max-w-2xl mx-auto">Nossa equipe de captação está pronta para te atender agora mesmo.</p>
                    <button
                        onClick={handleWhatsapp}
                        className="bg-white text-primary px-8 py-3 rounded-full font-bold shadow-xl hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">support_agent</span>
                        Falar com Especialista
                    </button>
                </section>

            </main>
        </div>
    );
};

export default OwnerLanding;