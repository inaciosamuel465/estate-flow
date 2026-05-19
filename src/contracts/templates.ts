import type { Contract, Property, User } from '../types';

export type ContractTemplateId =
  | 'rent_residential'
  | 'sale_cash'
  | 'sale_installments'
  | 'rent_termination'
  | 'property_management'
  | 'key_delivery'
  | 'inspection_report'
  | 'season_rent'
  | 'commercial_rent';

export interface ContractTemplate {
  id: ContractTemplateId;
  title: string;
  desc: string;
  type: 'rent' | 'sale' | 'term' | 'inspection' | 'management';
  requiresOwner: boolean;
  content: string;
}

export const OFFICIAL_CONTRACT_TEMPLATES: Record<ContractTemplateId, ContractTemplate> = {
  rent_residential: {
    id: 'rent_residential',
    title: 'Contrato de Locacao Residencial',
    desc: 'Modelo entre imobiliaria e locatario, sem proprietario como parte.',
    type: 'rent',
    requiresOwner: false,
    content: `CONTRATO DE LOCAÇÃO RESIDENCIAL
CLÁUSULA PRIMEIRA – DAS PARTES

IMOBILIÁRIA: {{REAL_ESTATE_NAME}}, inscrita no CNPJ sob nº {{REAL_ESTATE_DOC}}, com sede em {{REAL_ESTATE_ADDR}}, neste ato representada por seu responsável legal, doravante denominada simplesmente LOCADORA.

LOCATÁRIO: {{CLIENT_NAME}}, inscrito(a) no CPF sob nº {{CLIENT_DOC}}, residente e domiciliado(a) em {{CLIENT_ADDR}}, doravante denominado(a) simplesmente LOCATÁRIO.

CLÁUSULA SEGUNDA – DO OBJETO

O presente contrato tem como objeto a locação do imóvel residencial localizado em {{PROPERTY_ADDR}}, destinado exclusivamente para fins residenciais, sendo vedada sua utilização para fins comerciais, industriais ou quaisquer outras finalidades sem autorização expressa da LOCADORA.

CLÁUSULA TERCEIRA – DO PRAZO DA LOCAÇÃO

O prazo da presente locação será de {{LEASE_TERM}}, com início em {{START_DATE}} e término em {{END_DATE}}, podendo ser prorrogado mediante acordo formal entre as partes.

CLÁUSULA QUARTA – DO VALOR DO ALUGUEL

O LOCATÁRIO pagará mensalmente o valor de R$ {{VALUE}}, com vencimento em {{DUE_DATE}}, através da forma de pagamento cadastrada junto ao sistema da imobiliária.

Parágrafo primeiro: O não recebimento de boleto, cobrança ou notificação não isenta o LOCATÁRIO da obrigação de pagamento.

Parágrafo segundo: Os valores poderão ser reajustados conforme índice previsto na legislação vigente ou índice contratualmente definido pela imobiliária.

CLÁUSULA QUINTA – DOS ENCARGOS

São de responsabilidade do LOCATÁRIO todos os encargos incidentes sobre o uso do imóvel durante a vigência do contrato, incluindo:

água;
energia elétrica;
internet;
gás;
condomínio;
IPTU, quando aplicável;
taxas ordinárias de manutenção.
CLÁUSULA SEXTA – DA GARANTIA LOCATÍCIA

Como garantia do cumprimento das obrigações contratuais, o LOCATÁRIO apresentará a modalidade de garantia definida no cadastro da locação, registrada em {{GUARANTEE_TYPE}}.

CLÁUSULA SÉTIMA – DAS OBRIGAÇÕES DO LOCATÁRIO

O LOCATÁRIO compromete-se a:

I – conservar o imóvel em perfeito estado de uso;

II – devolver o imóvel nas mesmas condições em que o recebeu, ressalvado o desgaste natural;

III – não realizar modificações estruturais sem autorização prévia da LOCADORA;

IV – respeitar as normas de condomínio e boa convivência;

V – permitir visitas para vistoria mediante aviso prévio da imobiliária.

CLÁUSULA OITAVA – DAS BENFEITORIAS

Quaisquer benfeitorias realizadas no imóvel sem autorização expressa da LOCADORA não gerarão direito de indenização ou retenção do imóvel.

CLÁUSULA NONA – DA INADIMPLÊNCIA

O atraso no pagamento do aluguel ou encargos acarretará:

multa contratual;
juros de mora;
atualização monetária;
cobrança judicial ou extrajudicial;
possibilidade de rescisão contratual.
CLÁUSULA DÉCIMA – DA RESCISÃO

O contrato poderá ser rescindido:

I – por descumprimento contratual;

II – por inadimplência;

III – por acordo entre as partes;

IV – por desocupação antecipada pelo LOCATÁRIO, mediante pagamento de multa proporcional ao período restante do contrato, salvo hipóteses previstas em lei.

CLÁUSULA DÉCIMA PRIMEIRA – DA VISTORIA

O LOCATÁRIO declara receber o imóvel em conformidade com o laudo de vistoria anexado ao sistema da imobiliária, comprometendo-se a respeitar suas condições durante toda a vigência contratual.

CLÁUSULA DÉCIMA SEGUNDA – DA LGPD E ASSINATURA DIGITAL

As partes autorizam o tratamento de seus dados pessoais para fins administrativos, financeiros e contratuais, nos termos da legislação vigente de proteção de dados.

As partes reconhecem como válida a assinatura eletrônica ou digital realizada através do sistema da imobiliária.

CLÁUSULA DÉCIMA TERCEIRA – DO FORO

Fica eleito o foro da comarca de {{CITY_FORUM}} para dirimir quaisquer controvérsias oriundas deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.

E, por estarem justos e contratados, firmam o presente instrumento.

{{CITY}}, {{DATE_NOW}}.

LOCADORA

{{REAL_ESTATE_NAME}}

LOCATÁRIO

{{CLIENT_NAME}}`
  },
  sale_cash: {
    id: 'sale_cash',
    title: 'Contrato de Compra e Venda a Vista',
    desc: 'Modelo com imobiliaria, vendedor e comprador.',
    type: 'sale',
    requiresOwner: true,
    content: `CONTRATO DE COMPRA E VENDA À VISTA
CLÁUSULA PRIMEIRA – DAS PARTES

IMOBILIÁRIA: {{REAL_ESTATE_NAME}}, inscrita no CNPJ sob nº {{REAL_ESTATE_DOC}}, com sede em {{REAL_ESTATE_ADDR}}, doravante denominada simplesmente INTERMEDIADORA.

VENDEDOR: {{OWNER_NAME}}, inscrito(a) no CPF/CNPJ sob nº {{OWNER_DOC}}, doravante denominado(a) simplesmente VENDEDOR(A).

COMPRADOR: {{CLIENT_NAME}}, inscrito(a) no CPF sob nº {{CLIENT_DOC}}, residente e domiciliado(a) em {{CLIENT_ADDR}}, doravante denominado(a) simplesmente COMPRADOR(A).

CLÁUSULA SEGUNDA – DO OBJETO

O presente contrato tem como objeto a compra e venda do imóvel localizado em {{PROPERTY_ADDR}}, livre e desembaraçado de quaisquer ônus, dívidas ou impedimentos legais, salvo disposição expressa neste instrumento.

CLÁUSULA TERCEIRA – DO VALOR E FORMA DE PAGAMENTO

O valor total ajustado para a presente compra e venda é de R$ {{VALUE}}, pago à vista pelo COMPRADOR ao VENDEDOR, mediante forma de pagamento acordada entre as partes.

Parágrafo primeiro: O pagamento à vista será considerado quitado após a efetiva compensação bancária ou confirmação financeira da transação.

Parágrafo segundo: Após a confirmação do pagamento integral, o VENDEDOR dará plena, rasa e irrevogável quitação ao COMPRADOR.

CLÁUSULA QUARTA – DA INTERMEDIAÇÃO IMOBILIÁRIA

A intermediação da negociação foi realizada pela imobiliária {{REAL_ESTATE_NAME}}, responsável pelo acompanhamento administrativo, documental e contratual da operação imobiliária.

CLÁUSULA QUINTA – DA POSSE E ENTREGA DO IMÓVEL

A posse do imóvel será transmitida ao COMPRADOR após:

confirmação do pagamento integral;
assinatura deste contrato;
entrega das chaves;
cumprimento das obrigações previstas neste instrumento.
CLÁUSULA SEXTA – DAS OBRIGAÇÕES DO VENDEDOR

O VENDEDOR declara:

I – ser legítimo proprietário do imóvel;

II – que o imóvel encontra-se apto para venda;

III – que fornecerá toda documentação necessária para transferência;

IV – que responderá por evicção de direito na forma da legislação vigente.

CLÁUSULA SÉTIMA – DAS OBRIGAÇÕES DO COMPRADOR

O COMPRADOR compromete-se a:

I – realizar o pagamento conforme estabelecido neste contrato;

II – providenciar os documentos necessários para transferência;

III – arcar com custos de escritura, registro e tributos de transferência, salvo acordo contrário entre as partes.

CLÁUSULA OITAVA – DA DOCUMENTAÇÃO E TRANSFERÊNCIA

As partes comprometem-se a colaborar mutuamente para efetivação da escritura definitiva e transferência do imóvel perante os órgãos competentes.

CLÁUSULA NONA – DA IRREVOGABILIDADE

O presente compromisso é celebrado em caráter irrevogável e irretratável, obrigando as partes, seus herdeiros e sucessores ao fiel cumprimento de todas as cláusulas aqui estabelecidas.

CLÁUSULA DÉCIMA – DA RESCISÃO

O descumprimento de quaisquer obrigações previstas neste contrato poderá ensejar sua rescisão, sujeitando a parte inadimplente às penalidades legais cabíveis, inclusive perdas e danos.

CLÁUSULA DÉCIMA PRIMEIRA – DA LGPD E ASSINATURA DIGITAL

As partes autorizam o tratamento de seus dados pessoais para finalidades administrativas, financeiras e contratuais, conforme legislação vigente.

As assinaturas eletrônicas ou digitais realizadas pelo sistema da imobiliária terão plena validade jurídica.

CLÁUSULA DÉCIMA SEGUNDA – DO FORO

Fica eleito o foro da comarca de {{CITY_FORUM}} para dirimir quaisquer controvérsias oriundas deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.

E, por estarem justos e contratados, firmam o presente instrumento.

{{CITY}}, {{DATE_NOW}}.

INTERMEDIADORA

{{REAL_ESTATE_NAME}}

VENDEDOR(A)

{{OWNER_NAME}}

COMPRADOR(A)

{{CLIENT_NAME}}`
  },
  rent_termination: {
    id: 'rent_termination',
    title: 'Distrato de Contrato de Locacao Residencial',
    desc: 'Distrato entre imobiliaria e locatario.',
    type: 'term',
    requiresOwner: false,
    content: `DISTRATO DE CONTRATO DE LOCAÇÃO RESIDENCIAL
CLÁUSULA PRIMEIRA – DAS PARTES

IMOBILIÁRIA: {{REAL_ESTATE_NAME}}, inscrita no CNPJ sob nº {{REAL_ESTATE_DOC}}, com sede em {{REAL_ESTATE_ADDR}}, doravante denominada simplesmente LOCADORA/ADMINISTRADORA.

LOCATÁRIO: {{CLIENT_NAME}}, inscrito(a) no CPF sob nº {{CLIENT_DOC}}, residente e domiciliado(a) em {{CLIENT_ADDR}}, doravante denominado(a) simplesmente LOCATÁRIO.

CLÁUSULA SEGUNDA – DO CONTRATO ORIGINAL

As partes acima identificadas resolvem, de comum acordo, rescindir o Contrato de Locação referente ao imóvel localizado em {{PROPERTY_ADDR}}, firmado anteriormente entre as partes.

CLÁUSULA TERCEIRA – DA ENTREGA DO IMÓVEL

O LOCATÁRIO declara entregar, nesta data {{START_DATE}}, a posse do imóvel e todas as respectivas chaves à imobiliária responsável.

Parágrafo primeiro: A entrega do imóvel ficará condicionada à aprovação da vistoria final realizada pela imobiliária.

Parágrafo segundo: Caso sejam constatados danos, pendências financeiras, débitos de consumo, taxas em aberto ou necessidade de reparos além do desgaste natural, os respectivos valores poderão ser cobrados do LOCATÁRIO.

CLÁUSULA QUARTA – DAS MULTAS RESCISÓRIAS

Em razão da rescisão antecipada do contrato de locação, poderão ser aplicadas as seguintes penalidades contratuais, conforme análise do período cumprido e condições previstas no contrato original:

I – multa rescisória proporcional ao tempo restante do contrato;

II – cobrança proporcional de aluguel e encargos pendentes até a efetiva entrega das chaves;

III – valores referentes a danos identificados em vistoria;

IV – débitos de água, energia elétrica, condomínio, IPTU, internet, gás ou demais encargos vinculados ao imóvel;

V – eventuais custas administrativas ou honorários decorrentes de inadimplência contratual.

Parágrafo primeiro: A multa rescisória será calculada proporcionalmente ao prazo restante da locação, conforme legislação vigente e cláusulas do contrato original.

Parágrafo segundo: Caso não existam débitos ou multas pendentes, será emitida quitação integral ao LOCATÁRIO.

CLÁUSULA QUINTA – DA VISTORIA FINAL

O imóvel será submetido à vistoria final pela imobiliária, sendo o LOCATÁRIO responsável por:

reparos necessários;
pintura, quando exigida contratualmente;
regularização de danos;
devolução do imóvel em condições equivalentes às recebidas no início da locação, ressalvado o desgaste natural de uso.
CLÁUSULA SEXTA – DA QUITAÇÃO

Após confirmação:

da entrega das chaves;
da aprovação da vistoria;
da inexistência de débitos;
do pagamento de eventuais multas e encargos;

as partes concederão plena, geral, irrevogável e irretratável quitação entre si, para nada mais reclamarem a qualquer título relacionado à presente locação.

CLÁUSULA SÉTIMA – DA DESOCUPAÇÃO

O LOCATÁRIO declara que o imóvel encontra-se totalmente desocupado de pessoas e bens pessoais na data da entrega das chaves.

CLÁUSULA OITAVA – DA LGPD E ASSINATURA DIGITAL

As partes autorizam o tratamento de seus dados pessoais para finalidades administrativas, financeiras e contratuais, nos termos da legislação vigente.

As assinaturas eletrônicas ou digitais realizadas através do sistema da imobiliária terão plena validade jurídica.

CLÁUSULA NONA – DO FORO

Fica eleito o foro da comarca de {{CITY_FORUM}} para dirimir quaisquer controvérsias oriundas deste distrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.

E, por estarem justos e acordados, firmam o presente instrumento.

{{CITY}}, {{DATE_NOW}}.

LOCADORA / ADMINISTRADORA

{{REAL_ESTATE_NAME}}

LOCATÁRIO

{{CLIENT_NAME}}`
  },
  property_management: {
    id: 'property_management',
    title: 'Contrato de Administracao Imobiliaria',
    desc: 'Modelo entre imobiliaria e proprietario.',
    type: 'management',
    requiresOwner: true,
    content: `CONTRATO DE ADMINISTRAÇÃO IMOBILIÁRIA
CLÁUSULA PRIMEIRA – DAS PARTES

IMOBILIÁRIA: {{REAL_ESTATE_NAME}}, inscrita no CNPJ sob nº {{REAL_ESTATE_DOC}}, com sede em {{REAL_ESTATE_ADDR}}, doravante denominada simplesmente ADMINISTRADORA.

PROPRIETÁRIO: {{OWNER_NAME}}, inscrito(a) no CPF/CNPJ sob nº {{OWNER_DOC}}, residente e domiciliado(a) em {{OWNER_ADDR}}, doravante denominado(a) simplesmente PROPRIETÁRIO(A).

CLÁUSULA SEGUNDA – DO OBJETO

O presente contrato tem como objeto a administração imobiliária do imóvel localizado em {{PROPERTY_ADDR}}, de propriedade do PROPRIETÁRIO, pela ADMINISTRADORA.

A administração compreenderá atividades relacionadas à divulgação, intermediação, locação, cobrança, atendimento, emissão de documentos, controle financeiro e demais serviços administrativos relacionados ao imóvel.

CLÁUSULA TERCEIRA – DA AUTORIZAÇÃO DE ADMINISTRAÇÃO

O PROPRIETÁRIO autoriza a ADMINISTRADORA a:

I – anunciar o imóvel em plataformas digitais e meios publicitários;

II – realizar atendimento de interessados;

III – efetuar visitas e apresentações do imóvel;

IV – elaborar contratos de locação;

V – emitir boletos, cobranças e recibos;

VI – realizar cobranças extrajudiciais relacionadas à locação;

VII – acompanhar vistorias de entrada e saída;

VIII – intermediar negociações relacionadas ao imóvel.

CLÁUSULA QUARTA – DA REMUNERAÇÃO DA ADMINISTRADORA

Pelos serviços prestados, o PROPRIETÁRIO pagará à ADMINISTRADORA a taxa de administração correspondente a {{ADMIN_FEE}} sobre os valores recebidos da locação.

Parágrafo primeiro: A remuneração poderá ser descontada automaticamente antes do repasse ao PROPRIETÁRIO.

Parágrafo segundo: Serviços extraordinários poderão ser cobrados separadamente mediante aprovação prévia do PROPRIETÁRIO.

CLÁUSULA QUINTA – DO REPASSE DE VALORES

Os valores recebidos dos locatários serão repassados ao PROPRIETÁRIO após:

compensação bancária;
desconto da taxa administrativa;
abatimento de encargos autorizados;
dedução de despesas vinculadas ao imóvel.

O repasse será realizado através da conta bancária cadastrada no sistema.

CLÁUSULA SEXTA – DAS OBRIGAÇÕES DO PROPRIETÁRIO

O PROPRIETÁRIO compromete-se a:

I – fornecer documentação válida do imóvel;

II – manter o imóvel regularizado perante os órgãos competentes;

III – informar quaisquer restrições judiciais ou financeiras;

IV – realizar manutenções estruturais necessárias;

V – comunicar alterações cadastrais à ADMINISTRADORA.

CLÁUSULA SÉTIMA – DAS OBRIGAÇÕES DA ADMINISTRADORA

A ADMINISTRADORA compromete-se a:

I – atuar com boa-fé e transparência;

II – administrar o imóvel conforme práticas do mercado imobiliário;

III – manter registros financeiros e contratuais;

IV – informar o PROPRIETÁRIO sobre inadimplências e ocorrências relevantes;

V – zelar pela organização documental da locação.

CLÁUSULA OITAVA – DA INADIMPLÊNCIA DO LOCATÁRIO

A ADMINISTRADORA não será responsável pelo pagamento de alugueis inadimplidos pelo locatário, salvo existência de garantia específica contratada.

A cobrança poderá ser realizada por meios administrativos ou judiciais, conforme necessidade.

CLÁUSULA NONA – DA VIGÊNCIA

O presente contrato terá vigência de {{ADMIN_TERM}}, iniciando-se em {{START_DATE}}, podendo ser renovado automaticamente caso não haja manifestação contrária das partes.

CLÁUSULA DÉCIMA – DA RESCISÃO

O presente contrato poderá ser rescindido:

I – por comum acordo entre as partes;

II – por descumprimento contratual;

III – mediante notificação prévia de {{NOTICE_DAYS}} dias;

IV – por encerramento da administração do imóvel.

Parágrafo único: Pendências financeiras e obrigações anteriores à rescisão permanecerão válidas até sua regularização.

CLÁUSULA DÉCIMA PRIMEIRA – DA LGPD E ASSINATURA DIGITAL

As partes autorizam o tratamento de dados pessoais para finalidades administrativas, financeiras e contratuais, nos termos da legislação vigente.

As assinaturas eletrônicas ou digitais realizadas pelo sistema terão plena validade jurídica.

CLÁUSULA DÉCIMA SEGUNDA – DO FORO

Fica eleito o foro da comarca de {{CITY_FORUM}} para dirimir quaisquer controvérsias oriundas deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.

E, por estarem justos e contratados, firmam o presente instrumento.

{{CITY}}, {{DATE_NOW}}.

ADMINISTRADORA

{{REAL_ESTATE_NAME}}

PROPRIETÁRIO(A)

{{OWNER_NAME}}`
  },
  sale_installments: {
    id: 'sale_installments',
    title: 'Contrato de Compra e Venda Parcelada',
    desc: 'Modelo de venda parcelada com imobiliaria, vendedor e comprador.',
    type: 'sale',
    requiresOwner: true,
    content: `CONTRATO DE COMPRA E VENDA PARCELADA
CLÁUSULA PRIMEIRA – DAS PARTES

IMOBILIÁRIA: {{REAL_ESTATE_NAME}}, inscrita no CNPJ sob nº {{REAL_ESTATE_DOC}}, com sede em {{REAL_ESTATE_ADDR}}, doravante denominada simplesmente INTERMEDIADORA.

VENDEDOR: {{OWNER_NAME}}, inscrito(a) no CPF/CNPJ sob nº {{OWNER_DOC}}, doravante denominado(a) simplesmente VENDEDOR(A).

COMPRADOR: {{CLIENT_NAME}}, inscrito(a) no CPF sob nº {{CLIENT_DOC}}, residente e domiciliado(a) em {{CLIENT_ADDR}}, doravante denominado(a) simplesmente COMPRADOR(A).

CLÁUSULA SEGUNDA – DO OBJETO

O presente contrato tem como objeto a compra e venda do imóvel localizado em {{PROPERTY_ADDR}}.

CLÁUSULA TERCEIRA – DO VALOR DA NEGOCIAÇÃO

O valor total da negociação será de R$ {{VALUE}}.

O pagamento será realizado da seguinte forma:

Entrada no valor de R$ {{DOWN_PAYMENT}};
{{INSTALLMENT_COUNT}} parcelas de R$ {{INSTALLMENT_VALUE}};
vencimento todo dia {{INSTALLMENT_DUE_DAY}} de cada mês.

Parágrafo primeiro: Os pagamentos deverão ser realizados através da forma cadastrada junto à imobiliária.

Parágrafo segundo: A quitação somente ocorrerá após compensação bancária dos valores.

CLÁUSULA QUARTA – DO ATRASO E INADIMPLÊNCIA

O atraso no pagamento das parcelas acarretará:

multa contratual;
juros de mora;
atualização monetária;
possibilidade de protesto;
cobrança judicial ou extrajudicial.

Parágrafo único: O inadimplemento superior a {{DEFAULT_DAYS}} dias poderá resultar na rescisão contratual.

CLÁUSULA QUINTA – DA POSSE DO IMÓVEL

A posse do imóvel será entregue ao COMPRADOR conforme acordo entre as partes, podendo ocorrer:

após pagamento da entrada;
após quitação integral;
conforme cláusula específica definida na negociação.
CLÁUSULA SEXTA – DA TRANSFERÊNCIA DEFINITIVA

A escritura definitiva e transferência do imóvel serão realizadas após a quitação total da negociação, salvo acordo diverso entre as partes.

CLÁUSULA SÉTIMA – DAS OBRIGAÇÕES DO VENDEDOR

O VENDEDOR declara:

I – possuir legitimidade sobre o imóvel;

II – fornecer documentação necessária;

III – responder legalmente por evicção de direito;

IV – manter regularidade documental até a transferência definitiva.

CLÁUSULA OITAVA – DAS OBRIGAÇÕES DO COMPRADOR

O COMPRADOR compromete-se a:

I – realizar os pagamentos nas datas acordadas;

II – fornecer documentação necessária;

III – arcar com despesas de escritura e registro, salvo disposição contrária.

CLÁUSULA NONA – DA RESCISÃO CONTRATUAL

O descumprimento das obrigações previstas poderá resultar na rescisão do presente contrato.

Parágrafo primeiro: Em caso de inadimplência do COMPRADOR, poderão ser retidos valores pagos a título de multa compensatória, conforme legislação aplicável.

Parágrafo segundo: Eventuais valores devolvidos observarão descontos administrativos, encargos e prejuízos comprovados.

CLÁUSULA DÉCIMA – DA INTERMEDIAÇÃO IMOBILIÁRIA

A negociação foi intermediada pela imobiliária {{REAL_ESTATE_NAME}}, responsável pelo acompanhamento contratual e administrativo da operação.

CLÁUSULA DÉCIMA PRIMEIRA – DA LGPD E ASSINATURA DIGITAL

As partes autorizam o tratamento de seus dados pessoais para finalidades administrativas, financeiras e contratuais.

As assinaturas eletrônicas ou digitais realizadas no sistema terão validade jurídica plena.

CLÁUSULA DÉCIMA SEGUNDA – DO FORO

Fica eleito o foro da comarca de {{CITY_FORUM}} para dirimir quaisquer controvérsias oriundas deste contrato.

E, por estarem justos e contratados, firmam o presente instrumento.

{{CITY}}, {{DATE_NOW}}.

INTERMEDIADORA

{{REAL_ESTATE_NAME}}

VENDEDOR(A)

{{OWNER_NAME}}

COMPRADOR(A)

{{CLIENT_NAME}}`
  },
  key_delivery: {
    id: 'key_delivery',
    title: 'Termo de Entrega de Chaves',
    desc: 'Termo entre imobiliaria e cliente.',
    type: 'term',
    requiresOwner: false,
    content: `TERMO DE ENTREGA DE CHAVES
CLÁUSULA PRIMEIRA – DAS PARTES

IMOBILIÁRIA: {{REAL_ESTATE_NAME}}, inscrita no CNPJ sob nº {{REAL_ESTATE_DOC}}, com sede em {{REAL_ESTATE_ADDR}}, doravante denominada simplesmente ADMINISTRADORA/IMOBILIÁRIA.

CLIENTE: {{CLIENT_NAME}}, inscrito(a) no CPF sob nº {{CLIENT_DOC}}, doravante denominado(a) simplesmente CLIENTE.

CLÁUSULA SEGUNDA – DO IMÓVEL

O presente termo refere-se ao imóvel localizado em {{PROPERTY_ADDR}}.

CLÁUSULA TERCEIRA – DA ENTREGA DAS CHAVES

A IMOBILIÁRIA entrega nesta data {{DATE_NOW}} ao CLIENTE as chaves do imóvel acima descrito, declarando ambas as partes que o imóvel encontra-se disponível para ocupação.

Parágrafo primeiro: O CLIENTE declara receber as chaves em perfeito estado de funcionamento e conservação, juntamente com os acessos, controles, cartões, tags, senhas ou dispositivos vinculados ao imóvel, quando aplicável.

Parágrafo segundo: A posse do imóvel inicia-se a partir da assinatura deste termo.

CLÁUSULA QUARTA – DAS RESPONSABILIDADES DO CLIENTE

A partir da entrega das chaves, o CLIENTE passa a ser responsável por:

conservação do imóvel;
pagamento de encargos de consumo;
segurança do imóvel;
cumprimento das cláusulas contratuais;
devolução futura nas condições acordadas.
CLÁUSULA QUINTA – DA VISTORIA

O CLIENTE declara ciência do laudo de vistoria realizado previamente pela imobiliária, concordando com as condições registradas no documento.

Parágrafo único: Eventuais observações adicionais poderão ser registradas no sistema da imobiliária no prazo de {{INSPECTION_DEADLINE}} após a entrega das chaves.

CLÁUSULA SEXTA – DAS CHAVES E ACESSOS ENTREGUES

Quantidade de chaves entregues: {{KEY_COUNT}}

Itens adicionais entregues:

{{ACCESS_ITEM_1}}
{{ACCESS_ITEM_2}}
{{ACCESS_ITEM_3}}
CLÁUSULA SÉTIMA – DA DEVOLUÇÃO FUTURA

Ao término da locação ou vínculo contratual, o CLIENTE compromete-se a devolver todas as chaves, controles e dispositivos recebidos.

A não devolução poderá gerar cobrança de substituição, troca de fechaduras, controles ou dispositivos de acesso.

CLÁUSULA OITAVA – DA LGPD E ASSINATURA DIGITAL

As partes autorizam o tratamento de dados pessoais para finalidades administrativas e contratuais, conforme legislação vigente.

As assinaturas eletrônicas ou digitais realizadas pelo sistema terão plena validade jurídica.

CLÁUSULA NONA – DO FORO

Fica eleito o foro da comarca de {{CITY_FORUM}} para dirimir quaisquer controvérsias oriundas deste termo.

E, por estarem justos e acordados, firmam o presente instrumento.

{{CITY}}, {{DATE_NOW}}.

IMOBILIÁRIA

{{REAL_ESTATE_NAME}}

CLIENTE

{{CLIENT_NAME}}`
  },
  inspection_report: {
    id: 'inspection_report',
    title: 'Termo de Vistoria de Imovel',
    desc: 'Laudo de vistoria com estados, ambientes e avarias.',
    type: 'inspection',
    requiresOwner: false,
    content: `TERMO DE VISTORIA DE IMÓVEL
CLÁUSULA PRIMEIRA – DAS PARTES

IMOBILIÁRIA: {{REAL_ESTATE_NAME}}, inscrita no CNPJ sob nº {{REAL_ESTATE_DOC}}, com sede em {{REAL_ESTATE_ADDR}}, doravante denominada simplesmente IMOBILIÁRIA/ADMINISTRADORA.

CLIENTE: {{CLIENT_NAME}}, inscrito(a) no CPF sob nº {{CLIENT_DOC}}, doravante denominado(a) simplesmente CLIENTE.

CLÁUSULA SEGUNDA – DO IMÓVEL

O presente termo refere-se à vistoria do imóvel localizado em {{PROPERTY_ADDR}}.

CLÁUSULA TERCEIRA – DA FINALIDADE DA VISTORIA

O presente laudo tem por finalidade registrar as condições físicas, estruturais e visuais do imóvel na data da vistoria, servindo como referência para futura comparação na devolução do imóvel.

CLÁUSULA QUARTA – DAS CONDIÇÕES GERAIS DO IMÓVEL

Na data da vistoria, foram observadas as seguintes condições gerais:

pintura: {{PAINT_STATUS}};
piso: {{FLOOR_STATUS}};
portas e fechaduras: {{DOOR_STATUS}};
janelas: {{WINDOW_STATUS}};
parte elétrica: {{ELECTRICAL_STATUS}};
parte hidráulica: {{HYDRAULIC_STATUS}};
iluminação: {{LIGHTING_STATUS}};
teto e paredes: {{WALL_STATUS}};
móveis e itens inclusos: {{FURNITURE_STATUS}};
limpeza geral: {{CLEANING_STATUS}}.
CLÁUSULA QUINTA – DOS CÔMODOS
Sala

{{ROOM_LIVING}}

Cozinha

{{ROOM_KITCHEN}}

Banheiro(s)

{{ROOM_BATHROOM}}

Quarto(s)

{{ROOM_BEDROOM}}

Área externa

{{ROOM_EXTERNAL}}

Garagem

{{ROOM_GARAGE}}

CLÁUSULA SEXTA – DOS EQUIPAMENTOS E ACESSÓRIOS

Itens existentes no imóvel:

{{ITEM_1}}
{{ITEM_2}}
{{ITEM_3}}
{{ITEM_4}}

Parágrafo único: O CLIENTE declara receber os itens acima nas condições descritas neste laudo.

CLÁUSULA SÉTIMA – DAS AVARIAS IDENTIFICADAS

Foram registradas as seguintes observações e avarias no imóvel:

{{PROPERTY_ISSUES}}

Parágrafo único: As avarias descritas neste termo não poderão ser posteriormente atribuídas ao CLIENTE, desde que já registradas nesta vistoria inicial.

CLÁUSULA OITAVA – DA RESPONSABILIDADE DE CONSERVAÇÃO

O CLIENTE compromete-se a conservar o imóvel durante toda a vigência contratual, responsabilizando-se por danos causados além do desgaste natural decorrente do uso regular.

CLÁUSULA NONA – DO PRAZO PARA CONTESTAÇÃO

O CLIENTE poderá apresentar complementações ou divergências referentes ao presente laudo no prazo de {{INSPECTION_DEADLINE}} após a assinatura deste documento.

Após esse período, considerar-se-á aceita integralmente a vistoria.

CLÁUSULA DÉCIMA – DA VISTORIA FINAL

Ao encerramento do contrato, será realizada nova vistoria para comparação das condições do imóvel, podendo haver cobranças referentes a danos, reparos ou pendências identificadas.

CLÁUSULA DÉCIMA PRIMEIRA – DA LGPD E ASSINATURA DIGITAL

As partes autorizam o tratamento de dados pessoais para finalidades administrativas e contratuais, conforme legislação vigente.

As assinaturas eletrônicas ou digitais realizadas no sistema terão plena validade jurídica.

CLÁUSULA DÉCIMA SEGUNDA – DO FORO

Fica eleito o foro da comarca de {{CITY_FORUM}} para dirimir quaisquer controvérsias oriundas deste termo.

E, por estarem justos e acordados, firmam o presente instrumento.

{{CITY}}, {{DATE_NOW}}.

IMOBILIÁRIA

{{REAL_ESTATE_NAME}}

CLIENTE

{{CLIENT_NAME}}`
  },
  season_rent: {
    id: 'season_rent',
    title: 'Contrato de Locacao por Temporada',
    desc: 'Locacao temporaria entre imobiliaria e locatario.',
    type: 'rent',
    requiresOwner: false,
    content: `CONTRATO DE LOCAÇÃO POR TEMPORADA
CLÁUSULA PRIMEIRA – DAS PARTES

IMOBILIÁRIA: {{REAL_ESTATE_NAME}}, inscrita no CNPJ sob nº {{REAL_ESTATE_DOC}}, com sede em {{REAL_ESTATE_ADDR}}, doravante denominada simplesmente LOCADORA/ADMINISTRADORA.

LOCATÁRIO: {{CLIENT_NAME}}, inscrito(a) no CPF sob nº {{CLIENT_DOC}}, residente e domiciliado(a) em {{CLIENT_ADDR}}, doravante denominado(a) simplesmente LOCATÁRIO.

CLÁUSULA SEGUNDA – DO OBJETO

O presente contrato tem como objeto a locação por temporada do imóvel localizado em {{PROPERTY_ADDR}}, destinado exclusivamente para hospedagem temporária e uso residencial transitório.

CLÁUSULA TERCEIRA – DO PRAZO DA LOCAÇÃO

A locação terá início em {{START_DATE}} e término em {{END_DATE}}, encerrando-se automaticamente independentemente de aviso prévio.

Parágrafo único: A permanência no imóvel após o prazo contratado dependerá de autorização expressa da imobiliária e poderá gerar cobranças adicionais.

CLÁUSULA QUARTA – DO VALOR E PAGAMENTO

O valor total da locação por temporada será de R$ {{VALUE}}.

O pagamento deverá ocorrer conforme condições acordadas no sistema da imobiliária.

Parágrafo primeiro: Poderá ser exigido pagamento antecipado parcial ou integral da reserva.

Parágrafo segundo: Taxas adicionais, caução ou garantia poderão ser aplicadas conforme cadastro da locação.

CLÁUSULA QUINTA – DA CAUÇÃO E GARANTIA

O LOCATÁRIO poderá realizar depósito caução no valor de R$ {{SECURITY_DEPOSIT}}, destinado à cobertura de:

danos ao imóvel;
itens quebrados;
limpeza extraordinária;
multas;
despesas pendentes.

Parágrafo único: Não havendo pendências, o valor poderá ser devolvido após vistoria final do imóvel.

CLÁUSULA SEXTA – DAS OBRIGAÇÕES DO LOCATÁRIO

O LOCATÁRIO compromete-se a:

I – utilizar o imóvel exclusivamente para fins residenciais temporários;

II – conservar o imóvel e seus itens;

III – respeitar regras de condomínio e vizinhança;

IV – não exceder a quantidade máxima de ocupantes permitida;

V – não realizar festas, eventos ou atividades ilegais sem autorização;

VI – devolver o imóvel nas mesmas condições recebidas.

CLÁUSULA SÉTIMA – DOS ITENS E MOBILIÁRIOS

O LOCATÁRIO declara receber o imóvel mobiliado e equipado conforme vistoria e relação de itens cadastrados pela imobiliária.

Eventuais danos ou perdas poderão ser cobrados do LOCATÁRIO.

CLÁUSULA OITAVA – DO CANCELAMENTO E RESCISÃO

O cancelamento da reserva ou saída antecipada poderá gerar retenção parcial ou integral de valores pagos, conforme política definida pela imobiliária.

Parágrafo primeiro: O descumprimento contratual poderá ensejar rescisão imediata da locação.

Parágrafo segundo: Em caso de infrações graves, a desocupação do imóvel poderá ser solicitada imediatamente.

CLÁUSULA NONA – DAS MULTAS E PENALIDADES

Poderão ser aplicadas multas em casos de:

danos ao imóvel;
excesso de ocupantes;
perturbação de terceiros;
descumprimento das regras internas;
atraso na desocupação do imóvel.
CLÁUSULA DÉCIMA – DA ENTREGA E DEVOLUÇÃO DAS CHAVES

As chaves serão entregues ao LOCATÁRIO no início da locação e deverão ser devolvidas ao término do período contratado.

A não devolução poderá gerar cobrança de troca de fechaduras e dispositivos de acesso.

CLÁUSULA DÉCIMA PRIMEIRA – DA LGPD E ASSINATURA DIGITAL

As partes autorizam o tratamento de dados pessoais para finalidades administrativas, financeiras e contratuais.

As assinaturas eletrônicas ou digitais realizadas pelo sistema terão validade jurídica plena.

CLÁUSULA DÉCIMA SEGUNDA – DO FORO

Fica eleito o foro da comarca de {{CITY_FORUM}} para dirimir quaisquer controvérsias oriundas deste contrato.

E, por estarem justos e contratados, firmam o presente instrumento.

{{CITY}}, {{DATE_NOW}}.

LOCADORA / ADMINISTRADORA

{{REAL_ESTATE_NAME}}

LOCATÁRIO

{{CLIENT_NAME}}`
  },
  commercial_rent: {
    id: 'commercial_rent',
    title: 'Contrato de Locacao Comercial',
    desc: 'Locacao comercial entre imobiliaria e locatario.',
    type: 'rent',
    requiresOwner: false,
    content: `CONTRATO DE LOCAÇÃO COMERCIAL
CLÁUSULA PRIMEIRA – DAS PARTES

IMOBILIÁRIA: {{REAL_ESTATE_NAME}}, inscrita no CNPJ sob nº {{REAL_ESTATE_DOC}}, com sede em {{REAL_ESTATE_ADDR}}, doravante denominada simplesmente LOCADORA/ADMINISTRADORA.

LOCATÁRIO: {{CLIENT_NAME}}, inscrito(a) no CPF/CNPJ sob nº {{CLIENT_DOC}}, com sede/residência em {{CLIENT_ADDR}}, doravante denominado(a) simplesmente LOCATÁRIO.

CLÁUSULA SEGUNDA – DO OBJETO

O presente contrato tem como objeto a locação comercial do imóvel localizado em {{PROPERTY_ADDR}}, destinado exclusivamente ao exercício de atividades comerciais, empresariais ou profissionais permitidas pela legislação vigente.

Parágrafo único: É vedada a utilização do imóvel para finalidade diversa daquela informada à imobiliária sem autorização prévia e expressa.

CLÁUSULA TERCEIRA – DO PRAZO DA LOCAÇÃO

O prazo da presente locação será de {{LEASE_TERM}}, com início em {{START_DATE}} e término em {{END_DATE}}.

Parágrafo único: A permanência do LOCATÁRIO no imóvel após o término contratual não implicará renovação automática sem concordância formal entre as partes.

CLÁUSULA QUARTA – DO VALOR DO ALUGUEL

O LOCATÁRIO pagará mensalmente o valor de R$ {{VALUE}}, com vencimento em {{DUE_DATE}}.

Parágrafo primeiro: O pagamento deverá ocorrer através da forma disponibilizada pela imobiliária.

Parágrafo segundo: O atraso no pagamento acarretará incidência de multa, juros e atualização monetária.

Parágrafo terceiro: O aluguel poderá sofrer reajuste periódico conforme índice contratual e legislação vigente.

CLÁUSULA QUINTA – DOS ENCARGOS E DESPESAS

São de responsabilidade do LOCATÁRIO:

água;
energia elétrica;
internet;
condomínio;
IPTU, quando aplicável;
taxas municipais;
licenças de funcionamento;
despesas operacionais decorrentes da atividade comercial.
CLÁUSULA SEXTA – DAS OBRIGAÇÕES DO LOCATÁRIO

O LOCATÁRIO compromete-se a:

I – conservar o imóvel durante toda a vigência contratual;

II – respeitar normas municipais, ambientais e condominiais;

III – obter licenças e autorizações necessárias para funcionamento de sua atividade;

IV – não realizar alterações estruturais sem autorização;

V – devolver o imóvel nas condições recebidas, ressalvado desgaste natural.

CLÁUSULA SÉTIMA – DAS BENFEITORIAS

Benfeitorias realizadas sem autorização prévia da imobiliária não gerarão direito de retenção ou indenização.

Parágrafo único: Melhorias incorporadas ao imóvel poderão permanecer no local sem obrigação de reembolso.

CLÁUSULA OITAVA – DA GARANTIA LOCATÍCIA

O LOCATÁRIO apresentará garantia locatícia através da modalidade {{GUARANTEE_TYPE}}, destinada ao cumprimento das obrigações contratuais.

CLÁUSULA NONA – DA INADIMPLÊNCIA

O atraso ou ausência de pagamento poderá resultar em:

multa contratual;
juros;
atualização monetária;
protesto;
cobrança judicial ou extrajudicial;
rescisão contratual;
despejo nos termos da legislação aplicável.
CLÁUSULA DÉCIMA – DA RESCISÃO

O contrato poderá ser rescindido:

I – por descumprimento contratual;

II – por inadimplência;

III – por acordo entre as partes;

IV – por encerramento irregular das atividades exercidas no imóvel.

Parágrafo único: Em caso de rescisão antecipada pelo LOCATÁRIO, poderá ser aplicada multa proporcional ao período restante do contrato.

CLÁUSULA DÉCIMA PRIMEIRA – DA VISTORIA E ENTREGA DO IMÓVEL

O LOCATÁRIO declara receber o imóvel conforme laudo de vistoria disponibilizado pela imobiliária.

Ao término da locação será realizada vistoria final para verificação das condições do imóvel.

CLÁUSULA DÉCIMA SEGUNDA – DA LGPD E ASSINATURA DIGITAL

As partes autorizam o tratamento de dados pessoais para finalidades administrativas, financeiras e contratuais.

As assinaturas eletrônicas ou digitais realizadas pelo sistema terão plena validade jurídica.

CLÁUSULA DÉCIMA TERCEIRA – DO FORO

Fica eleito o foro da comarca de {{CITY_FORUM}} para dirimir quaisquer controvérsias oriundas deste contrato.

E, por estarem justos e contratados, firmam o presente instrumento.

{{CITY}}, {{DATE_NOW}}.

LOCADORA / ADMINISTRADORA

{{REAL_ESTATE_NAME}}

LOCATÁRIO

{{CLIENT_NAME}}`
  }
};

export function templateToContractType(templateId?: string): 'rent' | 'sale' {
  const template = OFFICIAL_CONTRACT_TEMPLATES[(templateId || 'rent_residential') as ContractTemplateId];
  return template?.type === 'sale' ? 'sale' : 'rent';
}

const formatDate = (date?: string) => {
  if (!date) return '';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('pt-BR');
};

export function buildContractPlaceholders(input: {
  contract: Partial<Contract>;
  agency: Record<string, string>;
  client?: Partial<User>;
  owner?: Partial<User>;
  property?: Partial<Property>;
  inspection?: Record<string, string>;
}): Record<string, string> {
  const { contract, agency, client, owner, property, inspection = {} } = input;
  const location = property?.addressDetails
    ? `${property.addressDetails.street}, ${property.addressDetails.number} - ${property.addressDetails.neighborhood}, ${property.addressDetails.city} - ${property.addressDetails.state}`
    : property?.location || '';
  const city = property?.addressDetails?.city || agency.city || agency.CITY || location.split(',')[1]?.trim() || 'São Paulo';
  const value = Number(contract.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return {
    '{{REAL_ESTATE_NAME}}': agency.name || agency.companyName || 'Imobiliária',
    '{{REAL_ESTATE_DOC}}': agency.cnpj || agency.agencyCnpj || '',
    '{{REAL_ESTATE_ADDR}}': agency.address || '',
    '{{CLIENT_NAME}}': contract.clientName || client?.name || '',
    '{{CLIENT_DOC}}': client?.document || '',
    '{{CLIENT_ADDR}}': client?.address || '',
    '{{OWNER_NAME}}': contract.ownerName || owner?.name || '',
    '{{OWNER_DOC}}': owner?.document || '',
    '{{OWNER_ADDR}}': owner?.address || '',
    '{{PROPERTY_ADDR}}': location || contract.propertyTitle || '',
    '{{VALUE}}': value,
    '{{LEASE_TERM}}': agency.leaseTerm || 'prazo definido no cadastro',
    '{{START_DATE}}': formatDate(contract.startDate),
    '{{END_DATE}}': formatDate(contract.endDate),
    '{{DATE_NOW}}': new Date().toLocaleDateString('pt-BR'),
    '{{CITY}}': city,
    '{{CITY_FORUM}}': agency.cityForum || city,
    '{{DUE_DATE}}': contract.dueDay ? `dia ${contract.dueDay}` : agency.dueDate || '',
    '{{GUARANTEE_TYPE}}': agency.guaranteeType || 'conforme cadastro',
    '{{DOWN_PAYMENT}}': agency.downPayment || '0,00',
    '{{INSTALLMENT_COUNT}}': String(contract.installmentsTotal || agency.installmentCount || ''),
    '{{INSTALLMENT_VALUE}}': agency.installmentValue || '',
    '{{INSTALLMENT_DUE_DAY}}': agency.installmentDueDay || String(contract.dueDay || ''),
    '{{DEFAULT_DAYS}}': agency.defaultDays || '30',
    '{{ADMIN_FEE}}': agency.adminFee || (contract.commissionRate ? `${contract.commissionRate}%` : ''),
    '{{ADMIN_TERM}}': agency.adminTerm || '12 meses',
    '{{NOTICE_DAYS}}': agency.noticeDays || '30',
    '{{SECURITY_DEPOSIT}}': agency.securityDeposit || '0,00',
    '{{KEY_COUNT}}': agency.keyCount || '',
    '{{ACCESS_ITEM_1}}': agency.accessItem1 || '',
    '{{ACCESS_ITEM_2}}': agency.accessItem2 || '',
    '{{ACCESS_ITEM_3}}': agency.accessItem3 || '',
    '{{INSPECTION_DEADLINE}}': agency.inspectionDeadline || '7 dias',
    '{{PAINT_STATUS}}': inspection.PAINT_STATUS || agency.paintStatus || 'não informado',
    '{{FLOOR_STATUS}}': inspection.FLOOR_STATUS || agency.floorStatus || 'não informado',
    '{{DOOR_STATUS}}': inspection.DOOR_STATUS || agency.doorStatus || 'não informado',
    '{{WINDOW_STATUS}}': inspection.WINDOW_STATUS || agency.windowStatus || 'não informado',
    '{{ELECTRICAL_STATUS}}': inspection.ELECTRICAL_STATUS || agency.electricalStatus || 'não informado',
    '{{HYDRAULIC_STATUS}}': inspection.HYDRAULIC_STATUS || agency.hydraulicStatus || 'não informado',
    '{{LIGHTING_STATUS}}': inspection.LIGHTING_STATUS || agency.lightingStatus || 'não informado',
    '{{WALL_STATUS}}': inspection.WALL_STATUS || agency.wallStatus || 'não informado',
    '{{FURNITURE_STATUS}}': inspection.FURNITURE_STATUS || agency.furnitureStatus || 'não informado',
    '{{CLEANING_STATUS}}': inspection.CLEANING_STATUS || agency.cleaningStatus || 'não informado',
    '{{PROPERTY_ISSUES}}': inspection.PROPERTY_ISSUES || agency.propertyIssues || 'sem avarias registradas',
    '{{ROOM_LIVING}}': inspection.ROOM_LIVING || agency.roomLiving || 'não informado',
    '{{ROOM_KITCHEN}}': inspection.ROOM_KITCHEN || agency.roomKitchen || 'não informado',
    '{{ROOM_BATHROOM}}': inspection.ROOM_BATHROOM || agency.roomBathroom || 'não informado',
    '{{ROOM_BEDROOM}}': inspection.ROOM_BEDROOM || agency.roomBedroom || 'não informado',
    '{{ROOM_EXTERNAL}}': inspection.ROOM_EXTERNAL || agency.roomExternal || 'não informado',
    '{{ROOM_GARAGE}}': inspection.ROOM_GARAGE || agency.roomGarage || 'não informado',
    '{{ITEM_1}}': inspection.ITEM_1 || agency.item1 || '',
    '{{ITEM_2}}': inspection.ITEM_2 || agency.item2 || '',
    '{{ITEM_3}}': inspection.ITEM_3 || agency.item3 || '',
    '{{ITEM_4}}': inspection.ITEM_4 || agency.item4 || '',
  };
}

export function renderContractTemplate(templateId: string | undefined, placeholders: Record<string, string>) {
  const template = OFFICIAL_CONTRACT_TEMPLATES[(templateId || 'rent_residential') as ContractTemplateId] || OFFICIAL_CONTRACT_TEMPLATES.rent_residential;
  return Object.entries(placeholders).reduce(
    (text, [key, value]) => text.split(key).join(value || ''),
    template.content,
  );
}
