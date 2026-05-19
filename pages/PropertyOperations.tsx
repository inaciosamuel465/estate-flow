import React, { useEffect, useMemo, useState } from 'react';
import type { InspectionRoom, InspectionRoomStatus, Property, PropertyInspection, PropertyProcess, PropertyProcessDocument, PropertyProcessType, User } from '../src/types';
import {
  createPropertyProcess,
  getPropertyInspections,
  getPropertyProcesses,
  saveInspectionImage,
  savePropertyDocument,
  savePropertyInspection,
  sendPropertyDocumentEmail,
  updatePropertyProcess,
} from '../src/services/dataService';
import { generatePropertyOperationPDF } from '../src/services/pdfService';
import { buildInspectionRooms, buildProcessSteps, FLOW_LABELS, QUICK_ROOM_NOTES, ROOM_CHECKS } from '../src/operations/workflows';

interface PropertyOperationsProps {
  properties: Property[];
  users: User[];
  settings: Record<string, string>;
  onNavigate: (view: string) => void;
}

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  in_progress: 'Em andamento',
  blocked: 'Bloqueado',
  completed: 'Concluido',
  canceled: 'Cancelado',
  pending: 'Pendente',
  active: 'Em andamento',
  bad: 'Ruim',
  attention: 'Atencao',
  ok: 'Ok',
  na: 'N/A',
};

const roomStatusOptions: Array<{ value: InspectionRoomStatus; label: string; className: string }> = [
  { value: 'ok', label: 'Ok', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'attention', label: 'Atencao', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'bad', label: 'Ruim', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'na', label: 'N/A', className: 'bg-slate-50 text-slate-500 border-slate-200' },
];

const flowCards: Array<{ id: PropertyProcessType; title: string; desc: string; icon: string }> = [
  { id: 'rent', title: 'Aluguel', desc: 'Vistoria, contrato, chaves e encerramento.', icon: 'real_estate_agent' },
  { id: 'sale', title: 'Venda', desc: 'Documentos, contrato e entrega final.', icon: 'sell' },
  { id: 'season', title: 'Temporada', desc: 'Check-in, chaves, vistoria e check-out.', icon: 'beach_access' },
];

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = event => resolve(String(event.target?.result || ''));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const PropertyOperations: React.FC<PropertyOperationsProps> = ({ properties, users, settings, onNavigate }) => {
  const [processes, setProcesses] = useState<PropertyProcess[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [flowType, setFlowType] = useState<PropertyProcessType>('rent');
  const [propertyId, setPropertyId] = useState('');
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'all' | PropertyProcessType>('all');
  const [activeTab, setActiveTab] = useState<'timeline' | 'inspection' | 'documents'>('timeline');
  const [inspection, setInspection] = useState<PropertyInspection | null>(null);
  const [isSavingInspection, setIsSavingInspection] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [feedback, setFeedback] = useState('');

  const selectedProcess = processes.find(process => process.id === selectedId) || processes[0] || null;
  const selectedProperty = selectedProcess ? properties.find(property => String(property.id) === String(selectedProcess.propertyId)) : null;
  const clients = users.filter(user => user.role === 'client' || user.role === 'visitor');

  const filteredProcesses = useMemo(() => {
    return processes.filter(process => filter === 'all' || process.flowType === filter);
  }, [processes, filter]);

  const metrics = useMemo(() => ({
    total: processes.length,
    active: processes.filter(process => process.status === 'in_progress').length,
    docs: processes.reduce((acc, process) => acc + (process.documents?.length || 0), 0),
    completed: processes.filter(process => process.status === 'completed').length,
  }), [processes]);

  const loadProcesses = async () => {
    setIsLoading(true);
    try {
      const data = await getPropertyProcesses();
      setProcesses(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    } catch (error) {
      console.error(error);
      setFeedback('Nao foi possivel carregar as jornadas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  useEffect(() => {
    const loadInspection = async () => {
      if (!selectedProcess || !selectedProperty) {
        setInspection(null);
        return;
      }
      try {
        const rows = await getPropertyInspections(selectedProcess.id, selectedProcess.propertyId);
        if (rows[0]) {
          setInspection({ ...rows[0], rooms: rows[0].rooms?.length ? rows[0].rooms : buildInspectionRooms(selectedProperty) });
        } else {
          setInspection({
            id: `insp_${Date.now()}`,
            processId: selectedProcess.id,
            propertyId: String(selectedProcess.propertyId),
            type: selectedProcess.flowType === 'season' ? 'initial' : 'initial',
            status: 'draft',
            rooms: buildInspectionRooms(selectedProperty),
            notes: '',
          });
        }
      } catch {
        setInspection({
          id: `insp_${Date.now()}`,
          processId: selectedProcess.id,
          propertyId: String(selectedProcess.propertyId),
          type: 'initial',
          status: 'draft',
          rooms: buildInspectionRooms(selectedProperty),
          notes: '',
        });
      }
    };
    loadInspection();
  }, [selectedProcess?.id, selectedProperty?.id]);

  const createProcess = async () => {
    const property = properties.find(item => String(item.id) === String(propertyId));
    if (!property) {
      setFeedback('Selecione um imovel para iniciar a jornada.');
      return;
    }
    setIsCreating(true);
    setFeedback('');
    try {
      const created = await createPropertyProcess({
        propertyId: String(property.id),
        flowType,
        clientId: clientId || undefined,
        notes,
        steps: buildProcessSteps(flowType),
        currentStepId: 'start',
      });
      setProcesses(prev => [created, ...prev]);
      setSelectedId(created.id);
      setPropertyId('');
      setClientId('');
      setNotes('');
      setActiveTab('timeline');
      setFeedback('Jornada iniciada com sucesso.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao iniciar jornada.');
    } finally {
      setIsCreating(false);
    }
  };

  const updateStep = async (stepId: string, status: 'active' | 'completed' | 'blocked') => {
    if (!selectedProcess) return;
    const updatedSteps = selectedProcess.steps.map(step => {
      if (step.id === stepId) {
        return { ...step, status, completedAt: status === 'completed' ? new Date().toISOString() : step.completedAt };
      }
      return step.status === 'active' && status === 'active' ? { ...step, status: 'pending' as const } : step;
    });
    const currentStepId = status === 'active' ? stepId : selectedProcess.currentStepId;
    try {
      const updated = await updatePropertyProcess(selectedProcess.id, {
        steps: updatedSteps,
        currentStepId,
        status: updatedSteps.every(step => step.status === 'completed') ? 'completed' : selectedProcess.status,
      });
      setProcesses(prev => prev.map(process => process.id === updated.id ? updated : process));
      setFeedback('Etapa atualizada.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao atualizar etapa.');
    }
  };

  const updateRoom = (roomId: string, updater: (room: InspectionRoom) => InspectionRoom) => {
    setInspection(prev => {
      if (!prev) return prev;
      return { ...prev, rooms: prev.rooms.map(room => room.id === roomId ? updater(room) : room) };
    });
  };

  const toggleQuickNote = (room: InspectionRoom, note: string) => {
    const exists = room.quickNotes.includes(note);
    return { ...room, quickNotes: exists ? room.quickNotes.filter(item => item !== note) : [...room.quickNotes, note] };
  };

  const addRoomImage = async (roomId: string, file?: File) => {
    if (!file || !inspection || !selectedProcess) return;
    const dataUrl = await fileToDataUrl(file);
    updateRoom(roomId, room => ({ ...room, images: [...room.images, dataUrl] }));
  };

  const saveInspection = async (status: 'draft' | 'completed' = 'draft') => {
    if (!inspection || !selectedProcess) return;
    setIsSavingInspection(true);
    try {
      const payload = { ...inspection, status };
      const inspectionId = await savePropertyInspection(payload);
      for (const room of payload.rooms) {
        for (const img of room.images) {
          await saveInspectionImage({
            inspectionId,
            processId: selectedProcess.id,
            propertyId: selectedProcess.propertyId,
            room: room.name,
            category: room.type,
            imageUrl: img,
            notes: room.notes,
          }).catch(() => {});
        }
      }
      setInspection({ ...payload, id: inspectionId });
      setFeedback(status === 'completed' ? 'Vistoria concluida e salva.' : 'Vistoria salva.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao salvar vistoria.');
    } finally {
      setIsSavingInspection(false);
    }
  };

  const generatePdf = async () => {
    if (!selectedProcess || !selectedProperty) return;
    setIsGeneratingPdf(true);
    try {
      if (inspection) await saveInspection(inspection.status);
      const doc = await generatePropertyOperationPDF(selectedProcess, selectedProperty, inspection || undefined, settings);
      const fileName = `jornada_${selectedProperty.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const dataUrl = doc.output('datauristring');
      const documentId = await savePropertyDocument({
        processId: selectedProcess.id,
        propertyId: selectedProcess.propertyId,
        documentType: inspection ? 'inspection' : 'summary',
        title: inspection ? 'Laudo de vistoria' : 'Resumo da jornada',
        fileName,
        fileData: dataUrl,
      });
      doc.save(fileName);
      await loadProcesses();
      setSelectedId(selectedProcess.id);
      setFeedback(`PDF gerado e salvo como documento #${documentId}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao gerar PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const sendDocument = async (document: PropertyProcessDocument) => {
    if (!sendEmail) {
      setFeedback('Informe o email de destino.');
      return;
    }
    try {
      await sendPropertyDocumentEmail({
        documentId: document.id,
        toEmail: sendEmail,
        subject: `${document.title} - ${selectedProcess?.propertyTitle || 'Imovel'}`,
        message: `Segue em anexo o documento ${document.title}.`,
      });
      await loadProcesses();
      setFeedback('Documento enviado por email.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao enviar documento.');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white font-display">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Operacoes</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Jornada do Imovel</h1>
            <p className="text-sm text-slate-500 max-w-2xl">Controle venda, aluguel, temporada, vistorias, chaves, documentos e historico operacional por imovel.</p>
          </div>
          <button onClick={() => onNavigate('contracts')} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:border-primary hover:text-primary">
            <span className="material-symbols-outlined">gavel</span>
            Abrir Juridico
          </button>
        </header>

        {feedback && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 flex items-center justify-between gap-3">
            <span>{feedback}</span>
            <button onClick={() => setFeedback('')} className="material-symbols-outlined text-base">close</button>
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Jornadas', metrics.total, 'route'],
            ['Em andamento', metrics.active, 'pending_actions'],
            ['Documentos', metrics.docs, 'description'],
            ['Concluidas', metrics.completed, 'verified'],
          ].map(([label, value, icon]) => (
            <div key={String(label)} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <span className="material-symbols-outlined text-primary">{icon}</span>
              <p className="text-xs font-bold uppercase text-slate-400 mt-3">{label}</p>
              <p className="text-2xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          <aside className="space-y-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black">Iniciar Jornada</h2>
                <span className="material-symbols-outlined text-primary">add_circle</span>
              </div>
              <select value={propertyId} onChange={event => setPropertyId(event.target.value)} className="w-full h-11 rounded-xl border-slate-200 text-sm">
                <option value="">Selecione o imovel...</option>
                {properties.map(property => <option key={property.id} value={String(property.id)}>{property.title}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                {flowCards.map(card => (
                  <button key={card.id} onClick={() => setFlowType(card.id)} className={`rounded-xl border p-3 text-left transition-all ${flowType === card.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className="material-symbols-outlined text-xl">{card.icon}</span>
                    <p className="text-xs font-black mt-1">{card.title}</p>
                  </button>
                ))}
              </div>
              <select value={clientId} onChange={event => setClientId(event.target.value)} className="w-full h-11 rounded-xl border-slate-200 text-sm">
                <option value="">Cliente/comprador opcional...</option>
                {clients.map(user => <option key={user.id} value={String(user.id)}>{user.name}</option>)}
              </select>
              <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} className="w-full rounded-xl border-slate-200 text-sm" placeholder="Observacoes iniciais..." />
              <button onClick={createProcess} disabled={isCreating || !propertyId} className="w-full h-11 rounded-xl bg-primary text-white font-black text-sm disabled:opacity-50">
                {isCreating ? 'Criando...' : 'Iniciar Jornada'}
              </button>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm space-y-3">
              <div className="flex gap-2 overflow-x-auto">
                {(['all', 'rent', 'sale', 'season'] as const).map(item => (
                  <button key={item} onClick={() => setFilter(item)} className={`px-3 py-2 rounded-lg text-xs font-black whitespace-nowrap ${filter === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {item === 'all' ? 'Todos' : FLOW_LABELS[item]}
                  </button>
                ))}
              </div>
              {isLoading ? (
                <div className="p-6 text-center text-sm text-slate-500">Carregando jornadas...</div>
              ) : filteredProcesses.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Nenhuma jornada encontrada.</div>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {filteredProcesses.map(process => (
                    <button key={process.id} onClick={() => setSelectedId(process.id)} className={`w-full rounded-xl border p-3 text-left transition-all ${selectedProcess?.id === process.id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <div className="flex gap-3">
                        <img src={process.propertyImage || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=300&auto=format&fit=crop'} className="size-14 rounded-lg object-cover" alt="" />
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-sm truncate">{process.propertyTitle}</p>
                          <p className="text-xs text-slate-500">{FLOW_LABELS[process.flowType]} - {statusLabels[process.status] || process.status}</p>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${Math.round((process.steps.filter(step => step.status === 'completed').length / Math.max(process.steps.length, 1)) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <main className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden min-h-[640px]">
            {!selectedProcess || !selectedProperty ? (
              <div className="h-full min-h-[520px] flex items-center justify-center p-8 text-center text-slate-500">
                <div>
                  <span className="material-symbols-outlined text-5xl text-slate-300">route</span>
                  <p className="font-bold mt-3">Selecione ou inicie uma jornada.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex gap-4 min-w-0">
                    <img src={selectedProperty.image} className="size-16 rounded-xl object-cover" alt="" />
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase text-primary">{FLOW_LABELS[selectedProcess.flowType]}</p>
                      <h2 className="text-xl font-black truncate">{selectedProcess.propertyTitle}</h2>
                      <p className="text-sm text-slate-500 truncate">{selectedProperty.location}</p>
                    </div>
                  </div>
                  <button onClick={generatePdf} disabled={isGeneratingPdf} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white font-black text-sm disabled:opacity-50">
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                    {isGeneratingPdf ? 'Gerando...' : 'Exportar PDF'}
                  </button>
                </div>

                <div className="border-b border-slate-100 px-3 flex gap-1 overflow-x-auto">
                  {[
                    ['timeline', 'Timeline', 'timeline'],
                    ['inspection', 'Vistoria', 'fact_check'],
                    ['documents', 'Documentos', 'folder_copy'],
                  ].map(([id, label, icon]) => (
                    <button key={id} onClick={() => setActiveTab(id as any)} className={`px-4 py-3 text-sm font-black flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === id ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}>
                      <span className="material-symbols-outlined text-lg">{icon}</span>{label}
                    </button>
                  ))}
                </div>

                {activeTab === 'timeline' && (
                  <div className="p-5 space-y-4">
                    {selectedProcess.steps.map(step => (
                      <div key={step.id} className="rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex gap-3">
                          <div className={`size-10 rounded-full flex items-center justify-center font-black ${step.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : step.status === 'active' ? 'bg-primary/10 text-primary' : step.status === 'blocked' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-400'}`}>
                            {step.status === 'completed' ? <span className="material-symbols-outlined">check</span> : step.order}
                          </div>
                          <div>
                            <h3 className="font-black">{step.title}</h3>
                            <p className="text-sm text-slate-500">{step.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => updateStep(step.id, 'active')} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-black">Ativa</button>
                          <button onClick={() => updateStep(step.id, 'completed')} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-black">Concluir</button>
                          <button onClick={() => updateStep(step.id, 'blocked')} className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-black">Bloquear</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'inspection' && inspection && (
                  <div className="p-5 space-y-5">
                    <div className="flex flex-col md:flex-row justify-between gap-3">
                      <div>
                        <h3 className="font-black text-lg">Vistoria guiada</h3>
                        <p className="text-sm text-slate-500">Comodos criados a partir do cadastro do imovel.</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveInspection('draft')} disabled={isSavingInspection} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-sm">Salvar</button>
                        <button onClick={() => saveInspection('completed')} disabled={isSavingInspection} className="px-4 py-2 rounded-xl bg-primary text-white font-black text-sm">Concluir vistoria</button>
                      </div>
                    </div>
                    <textarea value={inspection.notes || ''} onChange={event => setInspection({ ...inspection, notes: event.target.value })} className="w-full rounded-xl border-slate-200 text-sm" rows={2} placeholder="Observacoes gerais da vistoria..." />
                    <div className="space-y-4">
                      {inspection.rooms.map(room => (
                        <div key={room.id} className="rounded-2xl border border-slate-200 p-4 space-y-4">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <h4 className="font-black text-lg">{room.name}</h4>
                            <div className="flex flex-wrap gap-2">
                              {roomStatusOptions.map(option => (
                                <button key={option.value} onClick={() => updateRoom(room.id, current => ({ ...current, status: option.value }))} className={`px-3 py-1.5 rounded-lg border text-xs font-black ${room.status === option.value ? option.className : 'border-slate-200 text-slate-500 bg-white'}`}>
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {ROOM_CHECKS.map(check => (
                              <select key={check.id} value={room.checklist[check.id] || 'ok'} onChange={event => updateRoom(room.id, current => ({ ...current, checklist: { ...current.checklist, [check.id]: event.target.value as InspectionRoomStatus } }))} className="rounded-lg border-slate-200 text-xs">
                                <option value="ok">{check.label}: ok</option>
                                <option value="attention">{check.label}: atencao</option>
                                <option value="bad">{check.label}: ruim</option>
                                <option value="na">{check.label}: N/A</option>
                              </select>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {QUICK_ROOM_NOTES.map(note => (
                              <button key={note} onClick={() => updateRoom(room.id, current => toggleQuickNote(current, note))} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${room.quickNotes.includes(note) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>
                                {note}
                              </button>
                            ))}
                          </div>
                          <textarea value={room.notes || ''} onChange={event => updateRoom(room.id, current => ({ ...current, notes: event.target.value }))} className="w-full rounded-xl border-slate-200 text-sm" rows={2} placeholder={`Observacoes de ${room.name}...`} />
                          <div className="flex flex-wrap gap-3 items-center">
                            {room.images.map((img, index) => <img key={`${room.id}_${index}`} src={img} className="size-20 rounded-xl object-cover border border-slate-200" alt="" />)}
                            <label className="size-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-primary hover:text-primary">
                              <span className="material-symbols-outlined">add_a_photo</span>
                              <input type="file" accept="image/*" className="hidden" onChange={event => addRoomImage(room.id, event.target.files?.[0])} />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="p-5 space-y-4">
                    <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                      <div>
                        <h3 className="font-black text-lg">Documentos da jornada</h3>
                        <p className="text-sm text-slate-500">PDFs operacionais gerados e enviados sem assinatura.</p>
                      </div>
                      <input value={sendEmail} onChange={event => setSendEmail(event.target.value)} type="email" className="h-11 rounded-xl border-slate-200 text-sm md:w-80" placeholder="email@destino.com" />
                    </div>
                    {selectedProcess.documents?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedProcess.documents.map(document => (
                          <div key={document.id} className="rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
                            <div className="flex gap-3">
                              <span className="material-symbols-outlined text-primary">picture_as_pdf</span>
                              <div>
                                <p className="font-black">{document.title}</p>
                                <p className="text-xs text-slate-500">{document.fileName} {document.sentAt ? `- enviado em ${new Date(document.sentAt).toLocaleDateString('pt-BR')}` : ''}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {document.fileData && <a href={document.fileData} download={document.fileName || 'documento.pdf'} className="flex-1 text-center px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-black">Baixar</a>}
                              <button onClick={() => sendDocument(document)} className="flex-1 px-3 py-2 rounded-lg bg-primary text-white text-xs font-black">Enviar email</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                        <span className="material-symbols-outlined text-4xl text-slate-300">folder_off</span>
                        <p className="font-bold mt-2">Nenhum documento gerado ainda.</p>
                        <p className="text-sm">Use “Exportar PDF” para criar o primeiro documento da jornada.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </main>
        </section>
      </div>
    </div>
  );
};

export default PropertyOperations;
