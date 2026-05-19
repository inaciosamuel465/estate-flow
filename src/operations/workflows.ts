import type { InspectionRoom, Property, PropertyProcessStep, PropertyProcessType } from '../types';

export const FLOW_LABELS: Record<PropertyProcessType, string> = {
  rent: 'Aluguel',
  sale: 'Venda',
  season: 'Temporada',
};

export const ROOM_CHECKS = [
  { id: 'paint', label: 'Pintura' },
  { id: 'floor', label: 'Piso' },
  { id: 'doors', label: 'Portas' },
  { id: 'windows', label: 'Janelas' },
  { id: 'electrical', label: 'Elétrica' },
  { id: 'hydraulic', label: 'Hidráulica' },
  { id: 'lighting', label: 'Iluminação' },
  { id: 'walls', label: 'Paredes/teto' },
  { id: 'furniture', label: 'Móveis/itens' },
  { id: 'cleaning', label: 'Limpeza' },
];

export const QUICK_ROOM_NOTES = [
  'sem avarias',
  'pintura boa',
  'marcas de uso',
  'necessita reparo',
  'item ausente',
  'foto obrigatória',
];

export function buildProcessSteps(flowType: PropertyProcessType): PropertyProcessStep[] {
  const base: Record<PropertyProcessType, Array<Omit<PropertyProcessStep, 'status' | 'order'>>> = {
    rent: [
      { id: 'start', title: 'Início', kind: 'start', description: 'Jornada aberta e imóvel selecionado.' },
      { id: 'client', title: 'Dados do cliente', kind: 'client', description: 'Locatário e informações operacionais conferidos.' },
      { id: 'inspection_initial', title: 'Vistoria inicial', kind: 'inspection', description: 'Coleta guiada de cômodos, estados e imagens.' },
      { id: 'contract', title: 'Contrato', kind: 'contract', description: 'Gerar ou vincular contrato jurídico quando os dados estiverem prontos.' },
      { id: 'keys', title: 'Entrega de chaves', kind: 'keys', description: 'Registrar chaves, acessos e observações de entrega.' },
      { id: 'active', title: 'Imóvel ativo', kind: 'active', description: 'Locação em andamento.' },
      { id: 'inspection_final', title: 'Vistoria final', kind: 'inspection', description: 'Comparativo final e encerramento.' },
      { id: 'done', title: 'Concluído', kind: 'done', description: 'Jornada finalizada.' },
    ],
    sale: [
      { id: 'start', title: 'Início', kind: 'start', description: 'Jornada aberta e imóvel selecionado.' },
      { id: 'client', title: 'Comprador', kind: 'client', description: 'Comprador e documentos conferidos.' },
      { id: 'documents', title: 'Checklist documental', kind: 'documents', description: 'Documentação do imóvel e das partes revisada.' },
      { id: 'contract', title: 'Contrato de venda', kind: 'contract', description: 'Gerar ou vincular contrato de compra e venda.' },
      { id: 'keys', title: 'Entrega de chaves', kind: 'keys', description: 'Registrar chaves e observações finais.' },
      { id: 'done', title: 'Concluído', kind: 'done', description: 'Venda concluída.' },
    ],
    season: [
      { id: 'start', title: 'Reserva', kind: 'start', description: 'Reserva e dados básicos registrados.' },
      { id: 'client', title: 'Hóspede/cliente', kind: 'client', description: 'Dados de entrada conferidos.' },
      { id: 'inspection_initial', title: 'Vistoria de entrada', kind: 'inspection', description: 'Registro de estado antes do check-in.' },
      { id: 'keys', title: 'Check-in e chaves', kind: 'keys', description: 'Chaves, tags e acessos entregues.' },
      { id: 'checkout', title: 'Check-out', kind: 'checkout', description: 'Saída registrada.' },
      { id: 'inspection_final', title: 'Vistoria final', kind: 'inspection', description: 'Conferência pós-estadia.' },
      { id: 'done', title: 'Concluído', kind: 'done', description: 'Temporada encerrada.' },
    ],
  };

  return base[flowType].map((step, index) => ({
    ...step,
    order: index + 1,
    status: index === 0 ? 'active' : 'pending',
  }));
}

export function buildInspectionRooms(property: Property): InspectionRoom[] {
  const mk = (id: string, name: string, type: string): InspectionRoom => ({
    id,
    name,
    type,
    status: 'ok',
    checklist: ROOM_CHECKS.reduce((acc, item) => ({ ...acc, [item.id]: 'ok' }), {}),
    quickNotes: ['sem avarias'],
    notes: '',
    images: [],
  });

  const rooms: InspectionRoom[] = [
    mk('living', 'Sala', 'living'),
    mk('kitchen', 'Cozinha', 'kitchen'),
  ];

  const bathCount = Math.max(1, Number(property.baths || 1));
  for (let i = 1; i <= bathCount; i += 1) rooms.push(mk(`bathroom_${i}`, `Banheiro ${i}`, 'bathroom'));

  const bedCount = Math.max(0, Number(property.beds || 0));
  for (let i = 1; i <= bedCount; i += 1) rooms.push(mk(`bedroom_${i}`, `Quarto ${i}`, 'bedroom'));

  const amenities = (property.amenities || []).join(' ').toLowerCase();
  if (amenities.includes('garagem') || amenities.includes('vaga')) rooms.push(mk('garage', 'Garagem', 'garage'));
  if (property.type?.toLowerCase().includes('casa') || amenities.includes('quintal') || amenities.includes('varanda')) {
    rooms.push(mk('external', 'Área externa', 'external'));
  }

  return rooms;
}
