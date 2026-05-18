import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Contract, Property, User } from '../src/types';
import { addContract, deleteContract, updateContract } from '../src/services/dataService';
import { generateContractPDF, downloadPdfBlob } from '../src/services/pdfService';
import SignaturePad from '../components/SignaturePad';

// --- Dados da Imobiliária (dinâmico via settings) ---
const getAgencyInfo = (settings?: Record<string, string>) => ({
    name: settings?.companyName || "EstateFlow Negócios Imobiliários Ltda.",
    stampUrl: settings?.agencyStampUrl || '',
    stampName: settings?.agencyStampName || settings?.companyName || "EstateFlow Negócios Imobiliários Ltda.",
    cnpj: settings?.agencyCnpj || "12.345.678/0001-90",
    creci: settings?.agencyCreci || "J-12345",
    address: settings?.address || "Av. Paulista, 1000, 15º Andar - Jardins, São Paulo - SP",
    phone: settings?.contactPhone || "(11) 3000-0000",
    email: settings?.contactEmail || "juridico@estateflow.com",
    logo: settings?.logoUrl || ""
});

// --- Templates Jurídicos Profissionais e Detalhados ---
const CONTRACT_TEMPLATES = {
    rent_residential: {
        id: 'rent_residential',
        title: 'Locação Residencial (Administração)',
        desc: 'Contrato completo entre Locador (via Imobiliária) e Locatário.',
        content: `CONTRATO DE LOCAÇÃO RESIDENCIAL POR PRAZO DETERMINADO, COM ADMINISTRAÇÃO IMOBILIÁRIA

Pelo presente instrumento particular, as partes a seguir qualificadas:

CLÁUSULA PRIMEIRA - DAS PARTES E QUALIFICAÇÃO

1.1. LOCADOR: O proprietário do imóvel, devidamente cadastrado no sistema da ADMINISTRADORA, doravante denominado simplesmente LOCADOR, neste ato representado por sua administradora imobiliária.

1.2. ADMINISTRADORA: {{AGENCY_NAME}}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº {{AGENCY_CNPJ}}, com sede na {{AGENCY_ADDRESS}}, devidamente registrada no Conselho Regional de Corretores de Imóveis - CRECI sob nº {{AGENCY_CRECI}}, neste ato representada por seu representante legal, doravante denominada simplesmente ADMINISTRADORA.

1.3. LOCATÁRIO: {{CLIENT_NAME}}, nacionalidade, estado civil, profissão, portador(a) da Cédula de Identidade RG nº [RG], inscrito(a) no CPF/MF sob nº {{CLIENT_DOC}}, residente e domiciliado(a) à {{CLIENT_ADDR}}, doravante denominado simplesmente LOCATÁRIO.

1.4. FIADOR(ES): [Nome do fiador], [nacionalidade], [estado civil], [profissão], portador(a) da CI/RG nº [RG], inscrito(a) no CPF/MF sob nº [CPF], residente e domiciliado(a) à [Endereço] que neste ato, na qualidade de FIADOR, assume solidariamente com o LOCATÁRIO todas as obrigações decorrentes deste contrato, nos termos do parágrafo único do art. 818 e art. 819 do Código Civil Brasileiro, renunciando expressamente ao benefício de ordem e concordando em ser notificado pessoalmente para todos os atos processuais.

CLÁUSULA SEGUNDA - DO OBJETO E DESTINAÇÃO DO IMÓVEL

2.1. O presente contrato tem por objeto a locação do imóvel residencial constituído de [descrição resumida], situado à {{PROPERTY_ADDR}}, com área total de [área]m², devidamente registrado sob matrícula nº [matrícula] do Cartório de Registro de Imóveis da Comarca de {{PROPERTY_CITY}}, doravante denominado simplesmente IMÓVEL.

2.2. O IMÓVEL destina-se, única e exclusivamente, à residência do LOCATÁRIO e de seu núcleo familiar, sendo expressamente proibida a sua utilização para fins comerciais, profissionais, industriais ou associativos, sob pena de rescisão contratual imediata e aplicação da multa prevista na Cláusula Décima Segunda.

2.3. O LOCATÁRIO declara, sob as penas da lei, que:
a) Vistoriou pessoalmente o IMÓVEL e o recebe em perfeitas condições de habitabilidade, segurança e conservação;
b) Está ciente de todas as características físicas do IMÓVEL, incluindo suas dimensões, estado de conservação de pisos, paredes, instalações elétricas, hidráulicas, esquadrias, vidros e demais componentes;
c) Aceita o IMÓVEL no estado em que se encontra, obrigando-se a mantê-lo e restituí-lo nas mesmas condições, ressalvado o desgaste natural decorrente do uso regular e moderado.

CLÁUSULA TERCEIRA - DO PRAZO E VIGÊNCIA CONTRATUAL

3.1. O prazo da locação é de 30 (trinta) meses, com início em {{START_DATE}} e término em {{END_DATE}}, podendo ser prorrogado por prazo indeterminado na forma do art. 46 da Lei nº 8.245/91 (Lei do Inquilinato).

3.2. Findo o prazo estipulado, se nenhuma das partes manifestar, no prazo legal, o interesse de não renovar, a locação prorrogar-se-á automaticamente por prazo indeterminado, mantidas as demais condições e obrigações pactuadas neste instrumento.

3.3. Em se tratando de locação por prazo indeterminado, qualquer das partes poderá denunciar o contrato mediante notificação escrita com antecedência mínima de 30 (trinta) dias, nos termos do art. 6º da Lei nº 8.245/91.

3.4. O LOCATÁRIO obriga-se a restituir o IMÓVEL inteiramente livre e desocupado de pessoas e bens, nas mesmas condições em que o recebeu, no prazo máximo de 15 (quinze) dias contados do término do prazo contratual ou da denúncia, sob pena de incorrer em aluguel e encargos proporcionais pelo período de retenção, além das penalidades cabíveis.

CLÁUSULA QUARTA - DO VALOR DO ALUGUEL, REAJUSTE E FORMA DE PAGAMENTO

4.1. O aluguel mensal é fixado em R$ {{VALUE}} ({{VALUE_EXTENSO}}), que o LOCATÁRIO se obriga a pagar pontualmente até o dia {{DUE_DAY}} de cada mês subsequente ao vencido, diretamente à ADMINISTRADORA ou por meio de boleto bancário, PIX ou outro meio de pagamento por ela disponibilizado.

4.2. O não recebimento do boleto bancário até a data do vencimento não exime o LOCATÁRIO da obrigação de pagar pontualmente o aluguel e encargos, devendo o LOCATÁRIO solicitar a segunda via ou efetuar o pagamento diretamente na sede da ADMINISTRADORA.

4.3. O aluguel será reajustado anualmente, no mês de aniversário do presente contrato, aplicando-se a variação acumulada do Índice Geral de Preços do Mercado - IGP-M, apurado e divulgado pela Fundação Getúlio Vargas - FGV, ou na hipótese de extinção deste índice, pelo que vier a substituí-lo.

4.4. Na hipótese de o índice de reajuste não refletir adequadamente a variação do poder aquisitivo da moeda, as partes poderão, de comum acordo, eleger outro índice oficial que melhor atenda aos interesses recíprocos.

4.5. O atraso no pagamento do aluguel ou de qualquer encargo locatício, total ou parcial, implicará a incidência cumulativa de:
a) Multa moratória de 2% (dois por cento) sobre o valor do débito atualizado;
b) Juros de mora de 1% (um por cento) ao mês, calculados pro rata die;
c) Correção monetária pelo IGP-M/FGV ou índice contratualmente previsto, calculada pro rata die, desde a data do vencimento até a data do efetivo pagamento.

4.6. O LOCATÁRIO autoriza, desde já, a inscrição de seu nome e de seu(s) fiador(es) nos órgãos de proteção ao crédito (SPC, SERASA, CADIN e congêneres) em caso de inadimplemento superior a 30 (trinta) dias, independentemente de notificação judicial ou extrajudicial, nos termos do art. 43 do Código de Defesa do Consumidor e Súmula 322 do STJ.

4.7. O débito decorrente da inadimplência do LOCATÁRIO, incluídos aluguéis, encargos, multas, juros, correção monetária, honorários advocatícios e custas processuais, poderá ser objeto de ação de execução extrajudicial nos termos do art. 784 do Código de Processo Civil, por constituir título executivo extrajudicial.

CLÁUSULA QUINTA - DOS ENCARGOS E OBRIGAÇÕES TRIBUTÁRIAS

5.1. Além do aluguel, correrão por conta exclusiva do LOCATÁRIO, durante todo o período da locação:
a) Imposto Predial e Territorial Urbano - IPTU e taxa de coleta de lixo, calculados pro rata tempore quando do recebimento ou devolução do IMÓVEL;
b) Taxas municipais, estaduais ou federais que incidam ou venham a incidir sobre o IMÓVEL;
c) Despesas ordinárias de condomínio, rateadas na forma da respectiva Convenção de Condomínio, incluindo taxa de manutenção, salários, encargos sociais dos funcionários, energia, água e gás das áreas comuns, seguro obrigatório e fundo de reserva ordinário;
d) Consumo de água, luz, gás, internet, telefone, TV por assinatura e demais serviços de utilidade pública medidos por relógio ou consumo próprio;
e) Prêmio de seguro contra incêndio, danos elétricos, vendaval, desmoronamento e responsabilidade civil, conforme exige o art. 23, inciso VII, da Lei nº 8.245/91, a ser contratado pela ADMINISTRADORA em nome do LOCADOR, com valor rateado nas contas mensais.

5.2. As despesas extraordinárias de condomínio, assim definidas no art. 22 da Lei nº 8.245/91 (tais como obras estruturais, pintura externa, impermeabilização, substituição de elevador, indenizações trabalhistas e fundo de reserva), serão de responsabilidade do LOCADOR.

5.3. O LOCATÁRIO compromete-se a manter o IMÓVEL permanentemente segurado contra incêndio, mediante apólice compatível com o valor venal do IMÓVEL, sendo certo que a inadimplência do prêmio autoriza a ADMINISTRADORA a contratar o seguro e cobrar o valor nas contas mensais.

CLÁUSULA SEXTA - DA MANUTENÇÃO, REPAROS E CONSERVAÇÃO DO IMÓVEL

6.1. São considerados pequenos reparos e manutenções de responsabilidade do LOCATÁRIO, nos termos do art. 23, Inciso III, da Lei nº 8.245/91:
a) Troca de lâmpadas, luminárias, reatores e interruptores;
b) Reparos em fechaduras, maçanetas, dobradiças e trincos;
c) Desentupimento de pias, tanques, ralos e vasos sanitários;
d) Troca de vedação de torneiras, registros e válvulas de descarga;
e) Troca de vidros, espelhos e boxes, quando decorrentes de uso inadequado;
f) Pintura interna de paredes, quando necessária por desgaste anormal;
g) Reparos em armários embutidos, bancadas e tampos;
h) Manutenção de aparelhos sanitários e metais;
i) Pequenos reparos na rede elétrica (troca de tomadas, disjuntores simples);
j) Dedetização e desinsetização periódicas, quando necessário.

6.2. São considerados reparos estruturais e de responsabilidade do LOCADOR:
a) Infiltrações e vazamentos na estrutura da edificação;
b) Problemas na rede elétrica principal e quadros de distribuição;
c) Trincas e rachaduras estruturais em paredes, vigas e lajes;
d) Problemas na rede hidrossanitária embutida em paredes e pisos;
e) Troca de telhas e reparos no telhado quando não decorrentes de uso inadequado;
f) Problemas no sistema de impermeabilização de lajes e áreas molhadas;
g) Problemas estruturais em esquadrias quando não decorrentes de mau uso.

6.3. Para a realização de reparos estruturais, o LOCATÁRIO deverá comunicar formalmente a ADMINISTRADORA, que providenciará o reparo no prazo máximo de 30 (trinta) dias, salvo situações emergenciais que demandem intervenção imediata.

6.4. O LOCATÁRIO não poderá, sem prévia e expressa autorização por escrito do LOCADOR e/ou ADMINISTRADORA:
a) Realizar obras, modificações, benfeitorias ou alterações estruturais no IMÓVEL;
b) Furar, quebrar ou alterar paredes, pisos, tetos ou fachadas;
c) Instalar equipamentos que exijam modificações na rede elétrica ou hidráulica;
d) Modificar a pintura externa ou a fachada do IMÓVEL.

6.5. As benfeitorias necessárias introduzidas pelo LOCATÁRIO e não realizadas pelo LOCADOR após notificação serão indenizadas na forma do art. 35 da Lei nº 8.245/91, mediante comprovação das despesas.

6.6. As benfeitorias voluptuárias ou úteis realizadas sem autorização prévia por escrito poderão ser retidas ou levantadas pelo LOCATÁRIO, desde que não danifiquem o IMÓVEL, ou incorporadas ao imóvel sem direito a indenização, a critério do LOCADOR.

CLÁUSULA SÉTIMA - DA VISTORIA E DO LAUDO DE VISTORIA

7.1. Será lavrado Laudo de Vistoria, em duas vias, descrevendo minuciosamente o estado do IMÓVEL, com registro fotográfico de todos os cômodos, instalações, equipamentos e acabamentos, no ato da entrega das chaves e no momento da devolução.

7.2. O LOCATÁRIO declara receber uma via do Laudo de Vistoria de Entrada, concordando com seu conteúdo e firmando-o juntamente com a ADMINISTRADORA.

7.3. Por ocasião da devolução do IMÓVEL, será realizado novo Laudo de Vistoria de Saída, que confrontará as condições atuais com as registradas no Laudo de Entrada.

7.4. Os reparos eventualmente necessários para recomposição do IMÓVEL ao estado do recebimento (exceto desgaste natural) serão comunicados por escrito ao LOCATÁRIO, que terá o prazo de 15 (quinze) dias para realizá-los ou reembolsar os valores correspondentes.

7.5. Na omissão do LOCATÁRIO, a ADMINISTRADORA está autorizada a realizar os reparos e cobrar do LOCATÁRIO os valores despendidos, corrigidos monetariamente.

CLÁUSULA OITAVA - DA SUBCLOCAÇÃO, CESSÃO E TRANSFERÊNCIA

8.1. É vedado ao LOCATÁRIO ceder, sublocar, emprestar, doar ou transferir, total ou parcialmente, os direitos e obrigações decorrentes deste contrato, sob qualquer título, sem o prévio e expresso consentimento por escrito do LOCADOR.

8.2. A infringência ao disposto nesta cláusula autoriza a rescisão imediata do contrato, independentemente de notificação, aplicando-se a multa prevista na Cláusula Décima Segunda, sem prejuízo da cobrança dos aluguéis e encargos vincendos.

8.3. É igualmente vedado ao LOCATÁRIO hospedar pessoas estranhas ao núcleo familiar por período superior a 30 (trinta) dias consecutivos ou 60 (sessenta) dias alternados em um ano, salvo autorização expressa do LOCADOR.

CLÁUSULA NONA - DAS OBRIGAÇÕES DO LOCATÁRIO

9.1. Sem prejuízo das demais obrigações previstas neste contrato e na legislação aplicável, constituem obrigações do LOCATÁRIO:
a) Utilizar o IMÓVEL para fins exclusivamente residenciais, conforme Cláusula Segunda;
b) Pagar pontualmente o aluguel e todos os encargos previstos neste contrato;
c) Conservar o IMÓVEL no mais rigoroso estado de limpeza, higiene e conservação;
d) Cumprir integralmente as normas e regulamentos do condomínio, se houver;
e) Responsabilizar-se por danos causados ao IMÓVEL por si, seus familiares, visitantes, empregados ou prestadores de serviço;
f) Comunicar imediatamente à ADMINISTRADORA qualquer anormalidade verificada no IMÓVEL;
g) Permitir a entrada de técnicos e profissionais para vistorias, reparos ou manutenções, mediante prévio agendamento;
h) Manter atualizado seu endereço e contatos junto à ADMINISTRADORA;
i) Restituir o IMÓVEL nas condições em que o recebeu, conforme Cláusula Sétima;
j) Não praticar atos que perturbem a tranquilidade e o sossego dos vizinhos.

CLÁUSULA DÉCIMA - DAS OBRIGAÇÕES DO LOCADOR/ADMINISTRADORA

10.1. Constituem obrigações do LOCADOR, representado pela ADMINISTRADORA:
a) Garantir ao LOCATÁRIO o uso pacífico e contínuo do IMÓVEL durante toda a locação;
b) Realizar reparos estruturais de sua competência, conforme Cláusula Sexta;
c) Responder pelos vícios ou defeitos ocultos do IMÓVEL existentes à data da locação;
d) Efetuar o pagamento das despesas extraordinárias de condomínio;
e) Manter a ADMINISTRADORA devidamente habilitada perante o CRECI;
f) Disponibilizar ao LOCATÁRIO os comprovantes de pagamento de IPTU e demais tributos.

CLÁUSULA DÉCIMA PRIMEIRA - DO CONDOMÍNIO

11.1. O LOCATÁRIO obriga-se a cumprir fielmente a Convenção de Condomínio, o Regulamento Interno e as deliberações das assembleias condominiais.

11.2. O LOCATÁRIO responsabiliza-se por infrações, multas e penalidades aplicadas pelo condomínio em decorrência de atos seus, de seus familiares, visitantes ou prestadores de serviço.

11.3. A ADMINISTRADORA não se responsabiliza por questões internas do condomínio, cabendo ao LOCATÁRIO dirimi-las diretamente com o síndico ou administradora do condomínio.

CLÁUSULA DÉCIMA SEGUNDA - DA RESCISÃO ANTECIPADA E MULTA CONTRATUAL

12.1. A rescisão antecipada do contrato, a pedido do LOCATÁRIO, antes de transcorridos 12 (doze) meses de vigência, implicará o pagamento de multa compensatória equivalente a 03 (três) aluguéis vigentes à época da rescisão, reduzida proporcionalmente ao tempo restante do prazo contratual, nos termos do art. 4º, parágrafo único, da Lei nº 8.245/91.

12.2. O descumprimento de qualquer obrigação contratual pelo LOCATÁRIO, após notificação escrita com prazo de 15 (quinze) dias para regularização, autoriza a rescisão imediata do contrato, aplicando-se multa de 03 (três) aluguéis vigentes, sem prejuízo da cobrança dos valores em atraso.

12.3. Em caso de despejo judicial, o LOCATÁRIO arcará integralmente com todas as custas processuais, honorários advocatícios de sucumbência (fixados em 20% sobre o valor da causa) e demais despesas decorrentes da ação.

12.4. A multa prevista nesta cláusula não obsta a cobrança dos aluguéis e encargos vencidos e não pagos, que serão exigíveis cumulativamente.

CLÁUSULA DÉCIMA TERCEIRA - DAS GARANTIAS LOCATÍCIAS

13.1. Como garantia do fiel cumprimento de todas as obrigações decorrentes deste contrato, o LOCATÁRIO oferece, a critério do LOCADOR:
[Indicar a modalidade de garantia escolhida: Caução em Dinheiro / Título de Capitalização / Seguro-Fiança / Fiança]

13.2. A garantia prestada cobrirá todos os débitos do LOCATÁRIO, incluindo aluguéis, encargos, multas, juros, correção monetária, honorários advocatícios e custas processuais.

13.3. Em caso de fiança, o FIADOR declara ciência de todas as cláusulas deste contrato, responsabilizando-se solidariamente pelo cumprimento de todas as obrigações, renunciando expressamente ao benefício de ordem (art. 827 CC) e concordando com a notificação pessoal para todos os atos processuais (art. 819 CC).

CLÁUSULA DÉCIMA QUARTA - DO DIREITO DE PREFERÊNCIA

14.1. Em caso de venda ou promessa de venda do IMÓVEL, o LOCATÁRIO terá preferência para adquiri-lo nas mesmas condições ofertadas a terceiros, devendo ser notificado por escrito com antecedência mínima de 60 (sessenta) dias, nos termos do art. 27 e seguintes da Lei nº 8.245/91.

14.2. O LOCATÁRIO deverá manifestar seu interesse por escrito no prazo de 30 (trinta) dias contados do recebimento da notificação, sob pena de decadência do direito de preferência.

CLÁUSULA DÉCIMA QUINTA - DA RESPONSABILIDADE POR DANOS E MULTAS ADMINISTRATIVAS

15.1. O LOCATÁRIO é integralmente responsável por todos os danos materiais e morais causados ao IMÓVEL, às áreas comuns, aos vizinhos ou a terceiros, decorrentes de sua conduta, de seus familiares, visitantes, empregados ou prestadores de serviço.

15.2. Multas administrativas, ambientais ou de qualquer natureza aplicadas ao IMÓVEL em decorrência de atos ou omissões do LOCATÁRIO serão de sua exclusiva responsabilidade.

CLÁUSULA DÉCIMA SEXTA - DAS NOTIFICAÇÕES E COMUNICAÇÕES

16.1. As partes elegem como válidas e eficazes todas as notificações, intimações e comunicações enviadas por meio eletrônico (e-mail), aplicativos de mensagens instantâneas (WhatsApp), plataforma digital do sistema, ou correspondência física, para os endereços e contatos informados no ato da contratação ou posteriormente atualizados.

16.2. As comunicações serão consideradas recebidas:
a) Imediatamente, quando enviadas por e-mail ou WhatsApp em dias úteis em horário comercial;
b) Após 48 (quarenta e oito) horas do envio, quando enviadas por correspondência física;
c) No momento da visualização, quando veiculadas na plataforma digital do sistema.

CLÁUSULA DÉCIMA SÉTIMA - DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)

17.1. As partes comprometem-se a tratar os dados pessoais uma da outra em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018), observando os seguintes princípios:
a) Finalidade: os dados serão utilizados exclusivamente para a execução do presente contrato e obrigações legais decorrentes;
b) Adequação: o tratamento será compatível com as finalidades informadas;
c) Necessidade: somente serão coletados e tratados os dados estritamente necessários;
d) Segurança: serão adotadas medidas técnicas e administrativas para proteção dos dados contra acessos não autorizados, destruição, perda ou alteração.

17.2. O LOCATÁRIO autoriza expressamente a ADMINISTRADORA a compartilhar seus dados com o LOCADOR, fiador(es), órgãos de proteção ao crédito, cartórios de protesto e demais entidades necessárias para a execução e fiscalização do contrato.

CLÁUSULA DÉCIMA OITAVA - DAS DISPOSIÇÕES GERAIS

18.1. O presente contrato é celebrado em caráter irrevogável e irretratável, obrigando as partes, seus herdeiros e sucessores.

18.2. A tolerância quanto ao descumprimento de qualquer cláusula não constituirá novação ou precedente, podendo o direito ser exercido a qualquer momento.

18.3. Caso qualquer disposição deste contrato seja considerada inválida ou inexequível, as demais disposições permanecerão em pleno vigor e efeito.

18.4. O presente contrato é regido subsidiariamente pela Lei nº 8.245/91 (Lei do Inquilinato), pelo Código Civil Brasileiro (Lei nº 10.406/02) e demais legislações aplicáveis.

CLÁUSULA DÉCIMA NONA - DO FORO

19.1. Fica eleito o foro da Comarca de {{PROPERTY_CITY}} para dirimir todas as controvérsias e questões oriundas do presente contrato, com renúncia expressa e irrevogável a qualquer outro, por mais privilegiado que seja.`
    },
    sale_cash: {
        id: 'sale_cash',
        title: 'Compromisso de Compra e Venda',
        desc: 'Instrumento particular com intermediação da Imobiliária.',
        content: `INSTRUMENTO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA DE IMÓVEL, COM INTERMEDIAÇÃO IMOBILIÁRIA

Pelo presente instrumento particular, as partes a seguir qualificadas:

CLÁUSULA PRIMEIRA - DAS PARTES E QUALIFICAÇÃO

1.1. VENDEDOR: {{OWNER_NAME}}, [nacionalidade], [estado civil], [profissão], portador(a) da Cédula de Identidade RG nº [RG], inscrito(a) no CPF/CNPJ sob nº {{OWNER_DOC}}, residente e domiciliado(a) à [endereço], legítimo(a) proprietário(a) do imóvel objeto deste instrumento, conforme matrícula nº [matrícula] do Cartório de Registro de Imóveis da Comarca de {{PROPERTY_CITY}}, doravante denominado simplesmente VENDEDOR.

1.2. COMPRADOR: {{CLIENT_NAME}}, [nacionalidade], [estado civil], [profissão], portador(a) da Cédula de Identidade RG nº [RG], inscrito(a) no CPF/CNPJ sob nº {{CLIENT_DOC}}, residente e domiciliado(a) à {{CLIENT_ADDR}}, doravante denominado simplesmente COMPRADOR.

1.3. INTERMEDIADORA: {{AGENCY_NAME}}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº {{AGENCY_CNPJ}}, com sede à {{AGENCY_ADDRESS}}, devidamente registrada no Conselho Regional de Corretores de Imóveis - CRECI sob nº {{AGENCY_CRECI}}, neste ato representada por seu representante legal, doravante denominada simplesmente INTERMEDIADORA.

CLÁUSULA SEGUNDA - DAS DECLARAÇÕES DAS PARTES

2.1. O VENDEDOR declara, sob as penas do art. 299 do Código Penal, que:
a) É o legítimo, único e exclusivo proprietário do imóvel objeto deste instrumento;
b) O imóvel encontra-se livre e desembaraçado de quaisquer ônus reais, hipotecas, alienações fiduciárias, penhoras, sequestros, arrestos, ações judiciais reais ou pessoais reipersecutórias, inventários, arrolamentos, usufruto, uso, habitação, servidões ou quaisquer outros gravames ou restrições de qualquer natureza;
c) O imóvel está quite com todos os tributos municipais (IPTU, taxas), estaduais e federais, bem como com as contribuições condominiais, se aplicável;
d) Não responde a qualquer ação judicial ou extrajudicial que possa, direta ou indiretamente, afetar a livre disponibilidade, posse ou propriedade do imóvel;
e) Todas as informações e documentos fornecidos sobre o imóvel são verdadeiros, completos e correspondem à realidade;
f) O imóvel não possui débitos de qualquer natureza perante companhias de água, luz, gás ou outras concessionárias de serviços públicos.

2.2. O COMPRADOR declara que:
a) Teve amplo acesso ao imóvel, vistoriou-o pessoalmente e está ciente de seu estado de conservação, condições físicas, dimensões, localização, benfeitorias e características gerais;
b) Teve acesso a toda a documentação do imóvel, incluindo certidões, matrícula, plantas e comprovantes de quitação;
c) Aceita o imóvel no estado em que se encontra, isentando o VENDEDOR de quaisquer reparos ou benfeitorias futuras, ressalvados os vícios ocultos que comprometam a solidez, segurança ou habitabilidade;
d) Possui capacidade financeira para cumprir integralmente as obrigações assumidas neste instrumento.

CLÁUSULA TERCEIRA - DA INTERMEDIAÇÃO IMOBILIÁRIA

3.1. A INTERMEDIADORA declara estar devidamente habilitada e registrada no CRECI, tendo aproximado as partes, conduzido as negociações, prestado assessoria imobiliária completa, auxiliado na análise documental e na formatação jurídica do negócio.

3.2. As partes reconhecem, de forma expressa e irrevogável, a participação efetiva da INTERMEDIADORA na concretização deste negócio, declarando-se plenamente satisfeitas com os serviços prestados.

CLÁUSULA QUARTA - DO IMÓVEL

4.1. O imóvel objeto do presente compromisso é assim descrito: [descrição completa do imóvel conforme matrícula], situado à {{PROPERTY_ADDR}}, no Município de [cidade], Estado de [estado], com área de [área]m², contendo [cômodos], registrado sob nº [matrícula], no Cartório de Registro de Imóveis da Comarca de {{PROPERTY_CITY}}.

4.2. Integram o imóvel, como partes acessórias e inseparáveis, todas as benfeitorias, utilidades, direitos e pertenças existentes, incluindo: [listar equipamentos, móveis planejados, ar condicionado, etc., se aplicável].

CLÁUSULA QUINTA - DO PREÇO E CONDIÇÕES DE PAGAMENTO

5.1. O preço certo, ajustado e irretratável para a compra e venda é de R$ {{VALUE}} ({{VALUE_EXTENSO}}), que será pago nas seguintes condições e prazos:

5.1.1. SINAL: R$ [valor do sinal por extenso] ([valor numérico]), pago neste ato pelo COMPRADOR ao VENDEDOR, via [forma de pagamento], que dá plena e integral quitação, servindo o presente instrumento como o mais amplo e recibo.

5.1.2. PAGAMENTO COMPLEMENTAR: R$ [valor] ([valor por extenso]), a ser pago em [número] parcelas mensais e consecutivas no valor de R$ [valor cada] ([por extenso]), vencendo-se a primeira em [data] e as demais em igual dia dos meses subsequentes.

5.1.3. SALDO REMANESCENTE: R$ [valor] ([valor por extenso]), a ser pago na data da assinatura da Escritura Pública de Compra e Venda, mediante: (a) recursos próprios do COMPRADOR; (b) financiamento imobiliário a ser obtido pelo COMPRADOR junto a instituição financeira de sua escolha; ou (c) combinação de ambas as formas.

5.2. Todos os pagamentos serão efetuados mediante depósito em conta bancária de titularidade do VENDEDOR ou por meio de instrumentos de crédito que as partes vierem a acordar.

5.3. O atraso no pagamento de qualquer parcela implicará a incidência cumulativa de:
a) Multa moratória de 10% (dez por cento) sobre o valor da parcela em atraso;
b) Juros moratórios de 1% (um por cento) ao mês, calculados pro rata die;
c) Correção monetária pelo IGP-M/FGV, calculada pro rata die, desde a data do vencimento até o efetivo pagamento.

5.4. O inadimplemento superior a 90 (noventa) dias consecutivos ou alternados autoriza o VENDEDOR a considerar rescindido o presente compromisso, perdendo o COMPRADOR em favor do VENDEDOR, a título de cláusula penal compensatória, 30% (trinta por cento) de todos os valores efetivamente pagos, devendo o saldo remanescente ser restituído ao COMPRADOR em até 60 (sessenta) dias, corrigido monetariamente, sem prejuízo da cobrança das parcelas vencidas e não pagas.

CLÁUSULA SEXTA - DA DOCUMENTAÇÃO, ESCRITURA E REGISTRO

6.1. O VENDEDOR obriga-se a fornecer ao COMPRADOR, no prazo máximo de 15 (quinze) dias contados da solicitação, toda a documentação necessária para:
a) Obtenção de financiamento imobiliário, se houver;
b) Lavratura da Escritura Pública de Compra e Venda;
c) Registro da Escritura no Cartório de Registro de Imóveis competente.

6.2. A Escritura Pública de Compra e Venda será lavrada no prazo de 60 (sessenta) dias contados da quitação integral do preço ou da liberação do financiamento, em Cartório de Notas de livre escolha do COMPRADOR.

6.3. Correrão por conta exclusiva do COMPRADOR todas as despesas inerentes à transferência da propriedade, incluindo, mas não se limitando a:
a) Imposto de Transmissão de Bens Imóveis - ITBI;
b) Emolumentos cartorários para lavratura da Escritura;
c) Emolumentos para registro da Escritura no Cartório de Registro de Imóveis;
d) Certidões imobiliárias, pessoais, fiscais e trabalhistas;
e) Taxas e emolumentos de averbações necessárias;
f) Honorários advocatícios para análise documental, se contratados.

6.4. O VENDEDOR arcará com o Imposto de Renda sobre o ganho de capital eventualmente devido, bem como com a quitação de eventuais débitos tributários ou condominiais existentes até a data da transferência da propriedade.

CLÁUSULA SÉTIMA - DA POSSE E IMISSÃO

7.1. A posse direta e efetiva do imóvel será transmitida ao COMPRADOR na data da assinatura da Escritura Pública de Compra e Venda ou na data da quitação integral do preço, o que ocorrer primeiro, mediante a entrega das chaves e do Termo de Imissão na Posse.

7.2. Até a data da imissão na posse, o VENDEDOR responderá integralmente pela guarda, conservação e segurança do imóvel, bem como por todos os tributos, taxas, contribuições e despesas condominiais que incidirem sobre o imóvel.

7.3. Os riscos de perda ou deterioração do imóvel, inclusive por caso fortuito ou força maior, serão transferidos ao COMPRADOR a partir da data da imissão na posse.

CLÁUSULA OITAVA - DAS GARANTIAS E RESPONSABILIDADES

8.1. O VENDEDOR garante a evicção nos termos dos arts. 447 a 457 do Código Civil, responsabilizando-se integralmente pela perda total ou parcial do imóvel em decorrência de direito anterior de terceiro.

8.2. O VENDEDOR garante a existência e a validade do imóvel, responsabilizando-se pelos vícios redibitórios ocultos que comprometam a solidez, segurança ou habitabilidade, nos termos dos arts. 441 a 446 do Código Civil.

8.3. O COMPRADOR deverá comunicar ao VENDEDOR, por escrito, a constatação de vícios redibitórios no prazo de 30 (trinta) dias contados da descoberta, sob pena de decadência.

CLÁUSULA NONA - DO FINANCIAMENTO IMOBILIÁRIO

9.1. Em caso de pagamento do saldo mediante financiamento imobiliário, o COMPRADOR obriga-se a:
a) Iniciar o processo de financiamento em até 15 (quinze) dias da assinatura deste instrumento;
b) Fornecer toda a documentação solicitada pela instituição financeira nos prazos estipulados;
c) Informar ao VENDEDOR e à INTERMEDIADORA, imediatamente, qualquer intercorrência no processo.

9.2. Caso o financiamento não seja aprovado por culpa exclusiva do COMPRADOR (falta de documentação, restrições cadastrais pré-existentes não informadas, etc.), o VENDEDOR poderá optar pela rescisão do contrato, com a retenção de 20% (vinte por cento) dos valores pagos a título de cláusula penal.

9.3. Caso o financiamento não seja aprovado por decisão da instituição financeira sem culpa das partes, o presente compromisso será rescindido de pleno direito, restituindo-se ao COMPRADOR todos os valores pagos, no prazo de 30 (trinta) dias, sem retenção ou multa.

CLÁUSULA DÉCIMA - DA COMISSÃO DE CORRETAGEM

10.1. O VENDEDOR reconhece ser devida à INTERMEDIADORA a comissão de corretagem no valor correspondente a [percentual]% sobre o preço total da venda, no montante de R$ [valor] ([valor por extenso]).

10.2. A comissão será paga no ato da assinatura do presente instrumento ou na data do recebimento do sinal, deduzida do montante recebido, caso a INTERMEDIADORA esteja recebendo os valores em nome do VENDEDOR.

10.3. Em caso de desistência imotivada de qualquer das partes, ou de rescisão contratual por culpa exclusiva de qualquer das partes, a parte desistente ou culpada arcará integralmente com a comissão devida à INTERMEDIADORA, além das demais sanções contratuais.

CLÁUSULA DÉCIMA PRIMEIRA - DA IRREVOGABILIDADE E IRRATRATABILIDADE

11.1. O presente instrumento é celebrado em caráter irrevogável e irretratável, obrigando as partes contratantes, seus herdeiros, legatários e sucessores a todos os seus efeitos legais, nos termos do art. 1.417 do Código Civil.

11.2. O arrependimento imotivado de qualquer das partes, após a assinatura deste instrumento, implicará o pagamento de multa compensatória de 20% (vinte por cento) sobre o valor total do negócio, em favor da parte não arrependida, sem prejuízo das demais penalidades.

11.3. O presente compromisso confere ao COMPRADOR direito real à aquisição do imóvel, oponível a terceiros, nos termos do art. 1.417 do Código Civil, podendo ser registrado na matrícula do imóvel.

CLÁUSULA DÉCIMA SEGUNDA - DA RESCISÃO CONTRATUAL

12.1. Constituem hipóteses de rescisão contratual:
a) Inadimplemento de qualquer obrigação pecuniária por prazo superior a 90 (noventa) dias;
b) Descumprimento de qualquer declaração, garantia ou obrigação não pecuniária;
c) Desistência imotivada de qualquer das partes;
d) Não aprovação de financiamento por culpa do COMPRADOR;
e) Fraude, dolo ou simulação na celebração do contrato.

12.2. A rescisão será comunicada por escrito à parte inadimplente, concedendo-se prazo de 15 (quinze) dias para regularização, salvo nas hipóteses em que o prazo já tenha expirado.

CLÁUSULA DÉCIMA TERCEIRA - DAS DISPOSIÇÕES TRIBUTÁRIAS

13.1. O COMPRADOR é responsável pelo recolhimento do ITBI, nos termos da legislação municipal aplicável.

13.2. O VENDEDOR é responsável pelo recolhimento do Imposto de Renda sobre o ganho de capital, se devido, nos termos da legislação federal.

13.3. As partes se comprometem a declarar o presente negócio em suas respectivas declarações de Imposto de Renda, na forma da legislação fiscal vigente.

CLÁUSULA DÉCIMA QUARTA - DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)

14.1. As partes se comprometem a tratar os dados pessoais compartilhados em estrita conformidade com a Lei nº 13.709/2018 (LGPD), adotando as medidas técnicas e administrativas necessárias para proteger os dados contra acessos não autorizados, destruição, perda, alteração, comunicação ou qualquer forma de tratamento inadequado.

14.2. A INTERMEDIADORA fica autorizada a compartilhar os dados das partes com instituições financeiras, cartórios, órgãos públicos e demais entidades necessárias para a execução do presente contrato.

CLÁUSULA DÉCIMA QUINTA - DAS NOTIFICAÇÕES E COMUNICAÇÕES

15.1. Todas as notificações, comunicações e intimações entre as partes serão consideradas válidas quando realizadas por escrito, através de e-mail, WhatsApp, plataforma digital do sistema ou correspondência física, para os endereços e contatos informados neste instrumento ou posteriormente atualizados.

CLÁUSULA DÉCIMA SEXTA - DAS DISPOSIÇÕES GERAIS

16.1. O presente contrato é regido pelo Código Civil Brasileiro (Lei nº 10.406/02) e demais legislações aplicáveis.

16.2. A nulidade de qualquer cláusula não afetará a validade das demais disposições, que permanecerão em pleno vigor.

16.3. A tolerância quanto ao descumprimento de qualquer obrigação não constituirá novação contratual, podendo o direito ser exercido a qualquer momento.

CLÁUSULA DÉCIMA SÉTIMA - DO FORO

17.1. Para dirimir todas as controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca de {{PROPERTY_CITY}}, com renúncia expressa e irrevogável a qualquer outro, por mais privilegiado ou especial que seja.`
    },
    admin_service: {
        id: 'admin_service',
        title: 'Contrato de Administração (Proprietário)',
        desc: 'Contrato entre Proprietário e Imobiliária.',
        content: `CONTRATO DE ADMINISTRAÇÃO IMOBILIÁRIA - GESTÃO INTEGRAL DE IMÓVEL

Pelo presente instrumento particular, as partes a seguir qualificadas:

CLÁUSULA PRIMEIRA - DAS PARTES E QUALIFICAÇÃO

1.1. CONTRATANTE (PROPRIETÁRIO): {{OWNER_NAME}}, [nacionalidade], [estado civil], [profissão], portador(a) do CPF/CNPJ sob nº {{OWNER_DOC}}, residente e domiciliado(a) à [endereço], legítimo(a) proprietário(a) do imóvel objeto deste contrato, doravante denominado simplesmente CONTRATANTE.

1.2. CONTRATADA (ADMINISTRADORA): {{AGENCY_NAME}}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº {{AGENCY_CNPJ}}, com sede à {{AGENCY_ADDRESS}}, devidamente registrada no Conselho Regional de Corretores de Imóveis - CRECI sob nº {{AGENCY_CRECI}}, neste ato representada por seu representante legal, devidamente habilitada e em pleno gozo de seus direitos para o exercício da administração imobiliária, doravante denominada simplesmente CONTRATADA.

CLÁUSULA SEGUNDA - DO OBJETO E ESCOPO DA ADMINISTRAÇÃO

2.1. O CONTRATANTE entrega à CONTRATADA, para fins de administração imobiliária integral e exclusiva, o imóvel de sua propriedade situado à {{PROPERTY_ADDR}}, conforme descrito na matrícula nº [matrícula] do Cartório de Registro de Imóveis da Comarca de {{PROPERTY_CITY}}, doravante denominado simplesmente IMÓVEL.

2.2. A administração integral compreende todas as atividades necessárias à gestão completa do IMÓVEL, incluindo, mas não se limitando a locação, comercialização, cobrança, manutenção, conservação, gestão documental e financeira, repasses e prestação de contas.

CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES E SERVIÇOS DA CONTRATADA

3.1. A CONTRATADA obriga-se a prestar, com diligência e profissionalismo, os seguintes serviços:

3.1.1. MARKETING E DIVULGAÇÃO:
a) Publicação e veiculação do IMÓVEL em seu site institucional e plataformas digitais próprias;
b) Anúncio nos principais portais imobiliários do mercado;
c) Divulgação em redes sociais (Instagram, Facebook, YouTube) com conteúdo profissional, incluindo fotos, vídeos e tours virtuais;
d) Inserção no mailing ativo de clientes e prospects da CONTRATADA;
e) Utilização de ferramentas de marketing digital, incluindo anúncios patrocinados, quando aplicável;
f) Elaboração de material publicitário profissional (folders, ficha técnica, vídeos).

3.1.2. SELEÇÃO DE PRETENDENTES:
a) Triagem e qualificação de candidatos à locação ou compra;
b) Análise de documentação pessoal e profissional;
c) Verificação de idoneidade creditícia nos órgãos de proteção ao crédito;
d) Análise de capacidade de pagamento;
e) Exigência e análise de garantias locatícias compatíveis.

3.1.3. DOCUMENTAÇÃO E CONTRATUAL:
a) Elaboração de contratos de locação, compromissos de compra e venda e aditivos;
b) Elaboração de Laudos de Vistoria circunstanciados com registro fotográfico;
c) Gestão de registros e arquivos de toda a documentação contratual;
d) Emissão de boletos bancários para pagamento de aluguéis e encargos.

3.1.4. GESTÃO FINANCEIRA E COBRANÇA:
a) Cobrança administrativa de aluguéis e encargos, incluindo envio de notificações;
b) Cobrança extrajudicial via protesto de títulos e inclusão em órgãos de proteção ao crédito;
c) Cobrança judicial, mediante contratação de advogado, quando necessário, com custas apropriadas ao CONTRATANTE previamente aprovadas;
d) Recebimento e administração dos valores locatícios;
e) Efetivação dos repasses mensais ao CONTRATANTE.

3.1.5. MANUTENÇÃO E CONSERVAÇÃO:
a) Atendimento e triagem de solicitações de manutenção dos locatários;
b) Orçamento e cotação de reparos com fornecedores cadastrados e qualificados;
c) Supervisão e acompanhamento de serviços de manutenção e reparos;
d) Gestão de manutenções preventivas periódicas.

3.1.6. PRESTAÇÃO DE CONTAS E RELATÓRIOS:
a) Disponibilização mensal de extrato discriminado de receitas e despesas;
b) Relatório anual de desempenho do IMÓVEL;
c) Disponibilização de acesso online ao sistema de gestão para acompanhamento em tempo real.

3.2. A CONTRATADA não se responsabiliza por:
a) Inadimplência de locatários além das obrigações de cobrança estabelecidas nesta cláusula;
b) Ações judiciais de terceiros que não decorram de sua atuação direta;
c) Danos causados por locatários ou terceiros ao IMÓVEL;
d) Valorizações ou desvalorizações mercadológicas do IMÓVEL.

CLÁUSULA QUARTA - DA REMUNERAÇÃO, TAXAS E COMISSÕES

4.1. Pelos serviços de administração imobiliária prestados, a CONTRATADA fará jus às seguintes remunerações, que serão descontadas diretamente dos valores recebidos, antes do repasse ao CONTRATANTE:

4.1.1. TAXA DE INTERMEDIAÇÃO DE LOCAÇÃO: equivalente ao valor de 01 (um) aluguel integral, devida no ato da assinatura de cada contrato de locação, paga pelo CONTRATANTE.

4.1.2. TAXA DE ADMINISTRAÇÃO MENSAL: {{COMMISSION_RATE}}% ( [por extenso] por cento) sobre o valor bruto dos aluguéis e encargos efetivamente recebidos no mês, incidente sobre cada contrato de locação em vigor.

4.1.3. TAXA DE RENOVAÇÃO: 50% (cinquenta por cento) do valor de 01 (um) aluguel vigente, devida a cada renovação contratual, seja ela expressa ou tácita.

4.1.4. TAXA DE ADMINISTRAÇÃO DE VAGA: nos casos de imóveis com vagas de garagem locadas separadamente, será devida a taxa de administração de 10% (dez por cento) sobre o valor da locação da vaga.

4.2. As taxas e comissões previstas nesta cláusula serão reajustadas anualmente pelo IGP-M/FGV.

4.3. Em caso de rescisão antecipada deste contrato de administração antes do término de 12 (doze) meses, será devida à CONTRATADA multa equivalente a 06 (seis) meses da taxa de administração mensal média, como compensação pelos serviços de implantação e estruturação.

CLÁUSULA QUINTA - DA VIGÊNCIA, RENOVAÇÃO E DENÚNCIA

5.1. O presente contrato vigorará pelo prazo inicial de 12 (doze) meses, iniciando-se em {{START_DATE}}.

5.2. Ao final do prazo inicial, renovar-se-á automaticamente por iguais e sucessivos períodos de 12 (doze) meses, salvo manifestação em contrário por escrito de qualquer das partes, com antecedência mínima de 60 (sessenta) dias do término do período em curso.

5.3. Durante a vigência do contrato, o CONTRATANTE não poderá rescindi-lo sem justa causa, salvo mediante pagamento da multa compensatória prevista na Cláusula Quarta, item 4.3.

5.4. Em caso de venda do IMÓVEL, o presente contrato será automaticamente transferido ao novo proprietário, que deverá manifestar por escrito sua opção pela continuidade ou rescisão no prazo de 30 (trinta) dias.

CLÁUSULA SEXTA - DA EXCLUSIVIDADE

6.1. O CONTRATANTE concede à CONTRATADA exclusividade plena, total e irrestrita na administração, promoção, divulgação, locação e comercialização do IMÓVEL durante toda a vigência deste contrato.

6.2. Durante a vigência da exclusividade, o CONTRATANTE não poderá, direta ou indiretamente:
a) Contratar outros corretores, imobiliárias ou administradoras;
b) Negociar, locar, vender ou prometer vender o IMÓVEL sem intermediação da CONTRATADA;
c) Anunciar, divulgar ou promover o IMÓVEL por conta própria ou por terceiros;
d) Permitir visitações ou vistorias ao IMÓVEL sem acompanhamento da CONTRATADA.

6.3. A infração ao disposto nesta cláusula sujeitará o CONTRATANTE ao pagamento integral das taxas de administração e comissões que seriam devidas à CONTRATADA sobre o negócio realizado, independentemente de notificação ou interpelação.

CLÁUSULA SÉTIMA - DAS OBRIGAÇÕES DO CONTRATANTE

7.1. Sem prejuízo das demais obrigações previstas neste contrato, constituem obrigações do CONTRATANTE:
a) Manter o IMÓVEL em perfeitas condições de habitabilidade, segurança e conservação;
b) Realizar os reparos estruturais necessários, conforme solicitação fundamentada da CONTRATADA;
c) Manter o IMÓVEL devidamente segurado contra incêndio, danos elétricos e responsabilidade civil;
d) Fornecer à CONTRATADA toda a documentação do IMÓVEL atualizada sempre que solicitado;
e) Comunicar imediatamente à CONTRATADA qualquer alteração em seus dados cadastrais, bancários ou de contato;
f) Não praticar atos que possam prejudicar a administração ou a imagem do IMÓVEL;
g) Autorizar a realização de reparos e manutenções necessárias, mediante apresentação de orçamento prévio para serviços acima de R$ 500,00;
h) Comparecer à CONTRATADA para assinatura de contratos e documentos quando necessário.

CLÁUSULA OITAVA - DOS REPASSES FINANCEIROS

8.1. Os repasses mensais ao CONTRATANTE serão realizados até o dia 15 (quinze) do mês subsequente ao recebimento, mediante depósito em conta bancária por ele indicada.

8.2. O repasse será feito líquido de:
a) Taxa de administração mensal contratada;
b) Despesas de manutenção e reparos realizados no período;
c) Taxas e emolumentos administrativos;
d) Tributos incidentes sobre a operação, se houver.

8.3. A prestação de contas mensal será disponibilizada até o dia 10 (dez) do mês subsequente, por meio do sistema online, contendo:
a) Relação detalhada dos aluguéis e encargos recebidos;
b) Relação das despesas efetuadas, com comprovantes digitalizados;
c) Cálculo da taxa de administração;
d) Demonstrativo do valor líquido a ser repassado;
e) Comprovante de depósito ou transferência bancária.

CLÁUSULA NONA - DA RESCISÃO E PENALIDADES

9.1. A CONTRATADA poderá rescindir o presente contrato imediatamente, independentemente de notificação, nas seguintes hipóteses:
a) Descumprimento reiterado de obrigações contratuais pelo CONTRATANTE;
b) Venda do IMÓVEL sem comunicação prévia;
c) Conduta do CONTRATANTE que prejudique a administração;
d) Inviabilidade técnica, jurídica ou comercial da continuidade da administração.

9.2. O CONTRATANTE poderá rescindir o contrato a qualquer tempo, mediante pagamento da multa prevista na Cláusula Quarta, ou por justa causa, nas seguintes hipóteses:
a) Conduta desidiosa ou negligente comprovada da CONTRATADA;
b) Apropriação indébita de valores;
c) Descumprimento reiterado das obrigações contratuais pela CONTRATADA.

9.3. Rescindido o contrato, a CONTRATADA obriga-se a:
a) Entregar ao CONTRATANTE toda a documentação relativa ao IMÓVEL no prazo de 15 (quinze) dias;
b) Repassar todos os valores eventualmente retidos, líquidos das taxas devidas;
c) Transferir a administração ao CONTRATANTE ou a nova administradora indicada.

CLÁUSULA DÉCIMA - DAS VISTORIAS E INSPEÇÕES

10.1. A CONTRATADA realizará vistorias anuais no IMÓVEL, mediante prévio agendamento com os locatários, para verificação do estado de conservação.

10.2. Poderão ser realizadas vistorias extraordinárias, a qualquer tempo, em caso de denúncia de problemas ou suspeita de irregularidades.

10.3. Os laudos de vistoria serão disponibilizados ao CONTRATANTE em até 15 (quinze) dias da realização, com registro fotográfico.

CLÁUSULA DÉCIMA PRIMEIRA - DA RESPONSABILIDADE CIVIL E INDENIZAÇÕES

11.1. A CONTRATADA responderá civilmente por danos causados ao CONTRATANTE decorrentes de dolo ou culpa devidamente comprovados no exercício de suas atividades.

11.2. A responsabilidade da CONTRATADA fica limitada ao valor de 12 (doze) meses da taxa de administração recebida, salvo em caso de dolo ou conduta criminosa.

11.3. O CONTRATANTE responsabiliza-se por danos causados a terceiros ou ao IMÓVEL decorrentes de sua conduta ou de vícios estruturais de sua responsabilidade.

CLÁUSULA DÉCIMA SEGUNDA - DAS DISPOSIÇÕES GERAIS

12.1. O presente contrato é regido pelo Código Civil Brasileiro (Lei nº 10.406/02) e pela Resolução COFECI nº 326/92 e legislações correlatas.

12.2. A nulidade de qualquer cláusula não afetará a validade das demais disposições, que permanecerão em pleno vigor.

12.3. A tolerância quanto ao descumprimento de qualquer obrigação não constituirá novação contratual.

12.4. As partes elegem como válidas as comunicações enviadas por e-mail, WhatsApp, plataforma digital do sistema ou correspondência física para os endereços cadastrados.

CLÁUSULA DÉCIMA TERCEIRA - DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)

13.1. As partes comprometem-se a tratar os dados pessoais compartilhados em conformidade com a Lei nº 13.709/2018, adotando medidas de segurança técnicas e administrativas para proteção dos dados.

CLÁUSULA DÉCIMA QUARTA - DO FORO

14.1. Fica eleito o foro da Comarca de {{PROPERTY_CITY}} para dirimir todas as controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`
    }
};

interface ContractsPageProps {
    contracts: Contract[];
    properties: Property[];
    users: User[];
    settings?: Record<string, string>;
    onAddContract: (c: Contract) => void;
    onDeleteContract: (id: number | string) => void;
    onUpdateContract: (id: number | string, data: Partial<Contract>) => void;
}

const ContractsPage: React.FC<ContractsPageProps> = ({ contracts, properties, users, settings, onAddContract, onDeleteContract, onUpdateContract }) => {
    const AGENCY = useMemo(() => getAgencyInfo(settings), [settings]);

    // --- States ---
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'view'>('list');
    const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');
    const [filter, setFilter] = useState<'all' | 'expiring' | 'rent' | 'sale'>('all');
    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

    // Get templates from settings or use defaults
    const dynamicTemplates = useMemo(() => {
        if (settings?.contractTemplates) {
            try {
                const parsed = typeof settings.contractTemplates === 'string' 
                    ? JSON.parse(settings.contractTemplates) 
                    : settings.contractTemplates;
                
                const obj: Record<string, any> = {};
                if (Array.isArray(parsed)) {
                    parsed.forEach((t: any) => {
                        obj[t.id] = { ...t, desc: 'Modelo personalizado das configurações' };
                    });
                    return obj;
                }
            } catch (e) {
                console.error("Error parsing contractTemplates in ContractsPage", e);
            }
        }
        return CONTRACT_TEMPLATES;
    }, [settings]);

    // Create Mode States
    const [selectedTemplate, setSelectedTemplate] = useState<string>('rent_residential');
    const [creationStep, setCreationStep] = useState<'form' | 'preview'>('form');
    const [formData, setFormData] = useState({
        propertyId: '',
        clientId: '',
        ownerId: '',
        value: '',
        startDate: '',
        endDate: '',
        dueDay: '5',
        commissionRate: '10'
    });

    // View/Edit Mode States
    const [viewingContract, setViewingContract] = useState<Contract | null>(null);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [generatedBody, setGeneratedBody] = useState(''); 
    const [isEditingText, setIsEditingText] = useState(false);
    const [currentText, setCurrentText] = useState('');
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [a4Scale, setA4Scale] = useState(1);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateScale = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.clientWidth - 32;
                const a4WidthPx = 210 * 3.7795;
                setA4Scale(containerWidth < a4WidthPx ? containerWidth / a4WidthPx : 1);
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [viewingContract]);

    // --- Helpers ---

    const calculateDaysLeft = (dateString?: string) => {
        if (!dateString) return 999;
        const end = new Date(dateString);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Filter Logic
    const filteredContracts = useMemo(() => {
        return contracts.filter(c => {
            if (filter === 'all') return true;
            if (filter === 'rent') return c.type === 'rent';
            if (filter === 'sale') return c.type === 'sale';
            if (filter === 'expiring') {
                const days = calculateDaysLeft(c.endDate);
                return days <= 30 && days >= 0;
            }
            return true;
        });
    }, [contracts, filter]);

    const expiringCount = contracts.filter(c => {
        const days = calculateDaysLeft(c.endDate);
        return days <= 30 && days >= 0;
    }).length;

    // --- Actions ---

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (creationStep === 'form') {
            const prop = properties.find(p => p.id.toString() === formData.propertyId);
            const cli = users.find(u => u.id.toString() === formData.clientId);
            const own = users.find(u => u.id.toString() === formData.ownerId);

            if (!prop || !cli || !own) {
                alert("Dados inválidos. Verifique as seleções.");
                return;
            }

            // Mock contract for generation
            const mockContract: Partial<Contract> = {
                propertyId: prop.id,
                propertyTitle: prop.title,
                type: selectedTemplate === 'sale_cash' ? 'sale' : 'rent',
                clientId: cli.id,
                clientName: cli.name,
                ownerId: own.id,
                ownerName: own.name,
                value: parseFloat(formData.value),
                commissionRate: parseFloat(formData.commissionRate),
                dueDay: parseInt(formData.dueDay),
                startDate: formData.startDate,
                endDate: formData.endDate,
                templateType: selectedTemplate as any,
            };

            const body = generateDocumentBody(mockContract as Contract);
            setCurrentText(body);
            setCreationStep('preview');
            return;
        }

        // Step is 'preview' -> Save
        const prop = properties.find(p => p.id.toString() === formData.propertyId);
        const cli = users.find(u => u.id.toString() === formData.clientId);
        const own = users.find(u => u.id.toString() === formData.ownerId);

        if (!prop || !cli || !own) return;

        const contractData: Partial<Contract> = {
            propertyId: prop.id,
            propertyTitle: prop.title,
            propertyImage: prop.image,
            type: selectedTemplate === 'sale_cash' ? 'sale' : 'rent',
            clientId: cli.id,
            clientName: cli.name,
            clientPhone: cli.phone || '',
            ownerId: own.id,
            ownerName: own.name,
            ownerPhone: own.phone || '',
            value: parseFloat(formData.value),
            commissionRate: parseFloat(formData.commissionRate),
            dueDay: parseInt(formData.dueDay),
            startDate: formData.startDate,
            endDate: formData.endDate,
            templateType: selectedTemplate as any,
            customContent: currentText // Final edited content
        };

        if (editingContract) {
            onUpdateContract(editingContract.id, contractData);
            alert("Contrato atualizado com sucesso!");
        } else {
            const newContract: Contract = {
                id: Date.now(),
                status: 'active',
                nextPaymentStatus: 'pending',
                signatureStatus: 'pending',
                ...(contractData as any)
            };
            onAddContract(newContract);
            alert("Contrato gerado com sucesso!");
        }

        setViewMode('list');
        setCreationStep('form');
        setEditingContract(null);
        setFormData({ propertyId: '', clientId: '', ownerId: '', value: '', startDate: '', endDate: '', dueDay: '5', commissionRate: '10' });
    };

    const handleDelete = (id: number | string) => {
        if (confirm("Tem certeza que deseja excluir este contrato? Esta ação é irreversível.")) {
            onDeleteContract(id);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredContracts.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number | string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkDelete = () => {
        if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} contratos?`)) return;
        selectedIds.forEach(id => onDeleteContract(id));
        setSelectedIds([]);
    };

    const generateDocumentBody = (contract: Contract) => {
        const template = dynamicTemplates[contract.templateType || 'rent_residential'];
        if (!template) return "Template não encontrado.";

        const owner = users.find(u => u.id === contract.ownerId);
        const client = users.find(u => u.id === contract.clientId);
        const property = properties.find(p => p.id === contract.propertyId);

        let text = template.content;

        const replacements: Record<string, string> = {
            '{{AGENCY_NAME}}': AGENCY.name,
            '{{AGENCY_CNPJ}}': AGENCY.cnpj,
            '{{AGENCY_CRECI}}': AGENCY.creci,
            '{{AGENCY_ADDRESS}}': AGENCY.address,

            '{{OWNER_NAME}}': contract.ownerName.toUpperCase(),
            '{{OWNER_DOC}}': owner?.document || '000.000.000-00',

            '{{CLIENT_NAME}}': contract.clientName.toUpperCase(),
            '{{CLIENT_DOC}}': client?.document || '000.000.000-00',
            '{{CLIENT_ADDR}}': client?.address || 'Endereço não informado',

            '{{PROPERTY_ADDR}}': property ? `${property.location} - ${property.title}` : 'Endereço do Imóvel',
            '{{PROPERTY_CITY}}': property?.location.split(',')[1]?.trim() || 'São Paulo',

            '{{VALUE}}': contract.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            '{{VALUE_EXTENSO}}': 'valor pactuado', 

            '{{START_DATE}}': new Date(contract.startDate).toLocaleDateString('pt-BR'),
            '{{END_DATE}}': contract.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR') : 'Indeterminado',
            '{{DUE_DAY}}': contract.dueDay.toString(),
            '{{COMMISSION_RATE}}': contract.commissionRate.toString(),
            '{{DAYS_COUNT}}': contract.endDate ? Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24)).toString() : '0'
        };

        Object.keys(replacements).forEach(key => {
            text = text.replace(new RegExp(key, 'g'), replacements[key]);
        });

        // Anexa cláusulas legais adicionais das configurações
        if (settings?.contractLegalClauses) {
            text += '\n\n' + settings.contractLegalClauses;
        }

        return text;
    };

    const handleViewContract = (contract: Contract) => {
        setViewingContract(contract);
        const bodyText = contract.customContent || generateDocumentBody(contract);
        setGeneratedBody(bodyText);
        setCurrentText(bodyText);
        setIsEditingText(false);
        setViewMode('view');
    };

    const handleDownloadPDF = async (contract: Contract) => {
        const property = properties.find(p => p.id === contract.propertyId);
        const tenant = users.find(u => u.id === contract.clientId);
        const owner = users.find(u => u.id === contract.ownerId);

        if (!property || !tenant || !owner) {
            alert('Dados incompletos para gerar o PDF.');
            return;
        }

        const doc = await generateContractPDF(contract, property, tenant, owner, contract.customContent || generateDocumentBody(contract), AGENCY.logo, AGENCY.name, AGENCY.cnpj, AGENCY.creci, AGENCY.address, AGENCY.stampUrl, AGENCY.stampName);
        const fileName = `Contrato_${contract.type === 'rent' ? 'Locacao' : 'Venda'}_${contract.propertyTitle.replace(/\s+/g, '_')}.pdf`;
        downloadPdfBlob(doc, fileName);
    };

    const handleEditContract = (contract: Contract) => {
        setEditingContract(contract);
        setSelectedTemplate(contract.templateType as any || 'rent_residential');
        setFormData({
            propertyId: String(contract.propertyId),
            clientId: String(contract.clientId),
            ownerId: String(contract.ownerId),
            value: String(contract.value),
            startDate: contract.startDate,
            endDate: contract.endDate || '',
            dueDay: String(contract.dueDay),
            commissionRate: String(contract.commissionRate)
        });
        setViewMode('create');
    };

    const handleSaveContract = async () => {
        if (!viewingContract) return;
        setIsSavingContract(true);
        try {
            await onUpdateContract(viewingContract.id, {
                status: viewingContract.status,
                customContent: currentText,
                signatureStatus: viewingContract.signatureStatus,
                signatureImage: viewingContract.signatureImage,
                signedAt: viewingContract.signedAt,
            });
            alert("Contrato salvo com sucesso!");
        } catch (e) {
            console.error("Erro ao salvar contrato:", e);
            alert("Erro ao salvar contrato. Verifique sua conexão e tente novamente.");
        } finally {
            setIsSavingContract(false);
        }
    };

    const handlePrint = async () => {
        if (!viewingContract) return;
        const property = properties.find(p => p.id === viewingContract.propertyId);
        const tenant = users.find(u => u.id === viewingContract.clientId);
        const owner = users.find(u => u.id === viewingContract.ownerId);
        if (!property || !tenant || !owner) {
            alert('Dados incompletos para gerar o PDF.');
            return;
        }
        try {
            const doc = await generateContractPDF(viewingContract, property, tenant, owner, currentText, AGENCY.logo, AGENCY.name, AGENCY.cnpj, AGENCY.creci, AGENCY.address, AGENCY.stampUrl, AGENCY.stampName);
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) {
            console.error('Erro ao gerar PDF para impressao:', e);
            alert('Erro ao gerar PDF para impressao.');
        }
    };

    const handleSaveEdit = () => {
        if (viewingContract) {
            onUpdateContract(viewingContract.id, { customContent: currentText });
            setViewingContract({ ...viewingContract, customContent: currentText });
            alert("Conteúdo do contrato salvo com sucesso!");
        }
        setGeneratedBody(currentText);
        setIsEditingText(false);
    };

    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isOwnerSignatureModalOpen, setIsOwnerSignatureModalOpen] = useState(false);
    const [isSavingContract, setIsSavingContract] = useState(false);

    const handleSignatureSave = async (dataUrl: string) => {
        if (!viewingContract) return;
        try {
            await onUpdateContract(viewingContract.id, {
                signatureStatus: 'signed',
                signatureImage: dataUrl,
                signedAt: new Date().toISOString(),
                status: 'active'
            });
            setViewingContract({ 
                ...viewingContract, 
                signatureStatus: 'signed', 
                signatureImage: dataUrl,
                status: 'active' 
            });
            setIsSignatureModalOpen(false);
        } catch (e) {
            console.error("Erro ao salvar assinatura:", e);
            alert("Erro ao salvar assinatura no banco de dados. Verifique sua conexão e tente novamente.");
        }
    };

    const handleOwnerSignatureSave = async (dataUrl: string) => {
        if (!viewingContract) return;
        try {
            await onUpdateContract(viewingContract.id, {
                ownerSignatureStatus: 'signed',
                ownerSignatureImage: dataUrl,
                ownerSignedAt: new Date().toISOString(),
            });
            setViewingContract({ 
                ...viewingContract, 
                ownerSignatureStatus: 'signed' as const,
                ownerSignatureImage: dataUrl,
                ownerSignedAt: new Date().toISOString(),
            });
            setIsOwnerSignatureModalOpen(false);
        } catch (e) {
            console.error("Erro ao salvar assinatura da imobiliária:", e);
            alert("Erro ao salvar assinatura no banco de dados. Verifique sua conexão e tente novamente.");
        }
    };

    const handleSendForSignature = async () => {
        if (!viewingContract) return;
        setIsSendingEmail(true);
        try {
            // Clear previous signatures before re-sending
            await onUpdateContract(viewingContract.id, {
                signatureStatus: 'pending',
                signatureImage: null as any,
                signedAt: null as any,
                ownerSignatureStatus: 'pending',
                ownerSignatureImage: null as any,
                ownerSignedAt: null as any,
            });
            setViewingContract({
                ...viewingContract,
                signatureStatus: 'pending',
                signatureImage: undefined,
                signedAt: undefined,
                ownerSignatureStatus: 'pending',
                ownerSignatureImage: undefined,
                ownerSignedAt: undefined,
            });

            const baseUrl = settings?.appUrl || import.meta.env.VITE_APP_URL || window.location.origin;
            const tenantSlug = localStorage.getItem('estateflow_last_slug');
            const tenantPath = tenantSlug ? `/${tenantSlug}` : '';
            const contractUrl = `${baseUrl}${tenantPath}/contrato/${viewingContract.id}`;
            const client = users.find(u => u.id === viewingContract.clientId);
            const to = client?.email;
            if (!to) {
                alert('Cliente não possui email cadastrado.');
                setIsSendingEmail(false);
                return;
            }
            const logoBlock = AGENCY.logo
                ? `<div style="text-align:center;padding:30px 0 10px;"><img src="${AGENCY.logo}" style="max-height:70px;width:auto;" alt="${AGENCY.name}" /></div>`
                : `<div style="text-align:center;padding:30px 0 10px;"><div style="width:60px;height:60px;background:#e8f0fe;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;color:#2b6cee;">${AGENCY.name.charAt(0)}</div></div>`;
            const statusIcon = viewingContract.signatureStatus === 'signed'
                ? `<span style="display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;color:#059669;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;"><span style="font-size:16px;">✓</span> Assinado</span>`
                : `<span style="display:inline-flex;align-items:center;gap:6px;background:#fef3c7;color:#d97706;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;"><span style="font-size:16px;">⏳</span> Pendente</span>`;

            const plainText = `Olá ${viewingContract.clientName},

A ${AGENCY.name} disponibilizou para você o contrato do imóvel ${viewingContract.propertyTitle} para assinatura digital.

Acesse o link abaixo para ler, assinar e baixar o documento:
${contractUrl}

---
${AGENCY.name} · EstateFlow Suite
Este é um email automático. Por favor não responda.`;

            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to,
                    subject: `Contrato ${viewingContract.propertyTitle} - EstateFlow - Pendente de Assinatura`,
                    text: plainText,
                    html: `
                        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #e8ecf0;">
                            ${logoBlock}
                            <div style="padding:0 40px 30px;">
                                <div style="text-align:center;margin-bottom:24px;">
                                    <h1 style="font-size:22px;color:#0f172a;margin:0 0 4px;">Contrato para Assinatura</h1>
                                    <p style="font-size:14px;color:#64748b;margin:0;">${AGENCY.name}</p>
                                </div>

                                <div style="background:#f8fafc;border-radius:16px;padding:24px;margin-bottom:28px;border:1px solid #e8ecf0;">
                                    <table style="width:100%;border-collapse:collapse;">
                                        <tr>
                                            <td style="padding:6px 0;color:#64748b;font-size:13px;">Imóvel</td>
                                            <td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px;color:#0f172a;">${viewingContract.propertyTitle}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:6px 0;color:#64748b;font-size:13px;">Cliente</td>
                                            <td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px;color:#0f172a;">${viewingContract.clientName}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:6px 0;color:#64748b;font-size:13px;">Proprietário</td>
                                            <td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px;color:#0f172a;">${viewingContract.ownerName}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:6px 0;color:#64748b;font-size:13px;">Tipo</td>
                                            <td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px;color:#0f172a;">${viewingContract.type === 'rent' ? 'Locação' : 'Venda'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:6px 0;color:#64748b;font-size:13px;">Valor</td>
                                            <td style="padding:6px 0;text-align:right;font-weight:700;font-size:15px;color:#059669;">R$ ${Number(viewingContract.value).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:6px 0;color:#64748b;font-size:13px;">Status</td>
                                            <td style="padding:6px 0;text-align:right;">${statusIcon}</td>
                                        </tr>
                                    </table>
                                </div>

                                <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 8px;">Olá <strong style="color:#0f172a;">${viewingContract.clientName}</strong>,</p>
                                <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 24px;">
                                    A <strong style="color:#0f172a;">${AGENCY.name}</strong> disponibilizou para você o contrato do imóvel <strong>${viewingContract.propertyTitle}</strong> 
                                    para assinatura digital. Clique no botão abaixo para acessar, ler, assinar e baixar o documento.
                                </p>

                                <div style="text-align:center;margin:32px 0;">
                                    <a href="${contractUrl}" style="display:inline-block;background:linear-gradient(135deg,#2b6cee,#1a4fbf);color:#ffffff;padding:16px 48px;border-radius:14px;text-decoration:none;font-size:16px;font-weight:700;box-shadow:0 4px 14px rgba(43,108,238,0.35);">
                                        Acessar e Assinar
                                    </a>
                                </div>

                                <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:28px;">
                                    <p style="font-size:13px;color:#92400e;margin:0;line-height:1.5;">
                                        <strong>Segurança:</strong> Sua assinatura digital tem validade jurídica. 
                                        O documento ficará disponível para download após a assinatura.
                                    </p>
                                </div>

                                <p style="font-size:13px;color:#94a3b8;margin:0 0 12px;">Se o botão acima não funcionar, copie e cole este link no navegador:</p>
                                <div style="background:#f1f5f9;border-radius:10px;padding:12px 16px;word-break:break-all;font-size:12px;color:#2b6cee;font-family:monospace;margin-bottom:32px;">${contractUrl}</div>

                                <hr style="border:none;border-top:1px solid #e8ecf0;margin:0 0 20px;" />
                                <table style="width:100%;">
                                    <tr>
                                        <td style="width:40px;vertical-align:top;">
                                            <div style="width:32px;height:32px;background:#e8f0fe;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;color:#2b6cee;font-weight:bold;">${AGENCY.name.charAt(0)}</div>
                                        </td>
                                        <td style="vertical-align:top;">
                                            <p style="font-size:12px;color:#64748b;margin:0 0 2px;"><strong style="color:#334155;">${AGENCY.name}</strong> &middot; EstateFlow Suite</p>
                                            <p style="font-size:11px;color:#94a3b8;margin:0;">Este &eacute; um email autom&aacute;tico. Por favor n&atilde;o responda.</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    `
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Link de assinatura enviado para ${to}!`);
            } else {
                alert('Erro ao enviar email. Verifique as configurações de SMTP.');
            }
        } catch (e) {
            console.error('Erro ao enviar email:', e);
            alert('Erro de conexão ao enviar email.');
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display h-full flex flex-col overflow-hidden relative">
            <style>{`
                @media print {
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    #printable-area { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%;
                        height: auto;
                        display: block !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .contract-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                        border: none !important;
                        page-break-after: always !important;
                        display: flex !important;
                        flex-direction: column !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        transform: none !important;
                        zoom: 1 !important;
                    }
                    @page { 
                        size: A4; 
                        margin: 10mm;
                    }
                    h1, h2, p, div { color: black !important; }
                }
                .contract-page {
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    transition: transform 0.3s ease;
                }
            `}</style>

            {/* Header */}
            <header className="flex-none bg-surface-light dark:bg-[#111318] border-b border-slate-200 dark:border-slate-800 px-6 py-4 no-print">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px] mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">gavel</span> Gestão Jurídica
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Emissão e controle de contratos oficiais.</p>
                    </div>
                    <div className="flex gap-3">
                        {viewMode === 'list' ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-slate-100 dark:bg-[#111318] rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                                    <button
                                        onClick={() => setLayoutMode('grid')}
                                        className={`p-1.5 rounded-md transition-all ${layoutMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">grid_view</span>
                                    </button>
                                    <button
                                        onClick={() => setLayoutMode('table')}
                                        className={`p-1.5 rounded-md transition-all ${layoutMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">table_rows</span>
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingContract(null);
                                        setFormData({ propertyId: '', clientId: '', ownerId: '', value: '', startDate: '', endDate: '', dueDay: '5', commissionRate: '10' });
                                        setViewMode('create');
                                    }}
                                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-primary/20"
                                >
                                    <span className="material-symbols-outlined text-[20px]">add_circle</span> Novo Contrato
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setViewMode('list')}
                                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-white px-4 py-2 rounded-lg font-bold text-sm"
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span> Voltar à Lista
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100 dark:bg-black/20">
                <div className="max-w-[1600px] mx-auto flex flex-col gap-8">

                    {viewMode === 'list' && (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-[#1a1d23] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Contratos Ativos</p>
                                        <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{contracts.filter(c => c.status === 'active').length}</p>
                                    </div>
                                    <div className="size-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center">
                                        <span className="material-symbols-outlined">folder_shared</span>
                                    </div>
                                </div>
                                <div className={`bg-white dark:bg-[#1a1d23] p-5 rounded-xl border shadow-sm flex items-center justify-between ${expiringCount > 0 ? 'border-amber-500 ring-1 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800'}`}>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Renovação Pendente</p>
                                        <p className={`text-2xl font-bold mt-1 ${expiringCount > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>{expiringCount}</p>
                                    </div>
                                    <div className={`size-10 rounded-lg flex items-center justify-center ${expiringCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                                        <span className="material-symbols-outlined">alarm</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-[#1a1d23] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Pendentes Assinatura</p>
                                        <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{contracts.filter(c => c.signatureStatus === 'pending').length}</p>
                                    </div>
                                    <div className="size-10 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg flex items-center justify-center">
                                        <span className="material-symbols-outlined">ink_pen</span>
                                    </div>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
                                {[
                                    { id: 'all', label: 'Todos' },
                                    { id: 'rent', label: 'Locação' },
                                    { id: 'sale', label: 'Venda' },
                                    { id: 'expiring', label: 'Expirando', icon: 'warning' }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setFilter(f.id as any)}
                                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${filter === f.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* List Content */}
                            {layoutMode === 'grid' ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-10">
                                    {filteredContracts.map(contract => (
                                        <div key={contract.id} className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-4 hover:border-primary/50 transition-all group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary">
                                                        <span className="material-symbols-outlined text-[24px]">gavel</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{contract.propertyTitle}</h3>
                                                        <p className="text-xs text-slate-500 font-medium">{CONTRACT_TEMPLATES[contract.templateType || 'rent_residential']?.title}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${contract.signatureStatus === 'signed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                    {contract.signatureStatus === 'signed' ? 'Assinado' : 'Pendente'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Cliente</p>
                                                    <p className="text-sm font-bold truncate">{contract.clientName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Valor</p>
                                                    <p className="text-sm font-bold">{formatCurrency(contract.value)}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-auto pt-2">
                                                <button onClick={() => handleViewContract(contract)} className="flex-1 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                                                    <span className="material-symbols-outlined text-[18px]">visibility</span> Visualizar
                                                </button>
                                                <button onClick={() => handleDownloadPDF(contract)} className="px-4 py-2.5 border border-primary text-primary hover:bg-primary hover:text-white rounded-lg transition-all font-bold text-sm">
                                                    <span className="material-symbols-outlined text-[18px]">download</span> PDF
                                                </button>
                                                <button onClick={() => handleDelete(contract.id)} className="px-3 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all">
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111318]">
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contrato / Imóvel</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Partes</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Valor</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredContracts.map(contract => (
                                                <tr key={contract.id} className="hover:bg-slate-50 dark:hover:bg-[#20242c] transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-sm">{contract.propertyTitle}</div>
                                                        <div className="text-[10px] text-slate-400">{CONTRACT_TEMPLATES[contract.templateType || 'rent_residential']?.title}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-xs"><span className="font-bold">C:</span> {contract.clientName}</div>
                                                        <div className="text-xs text-slate-400"><span className="font-bold">P:</span> {contract.ownerName}</div>
                                                    </td>
                                                    <td className="p-4 font-bold text-sm">{formatCurrency(contract.value)}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${contract.signatureStatus === 'signed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                            {contract.signatureStatus === 'signed' ? 'Assinado' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleViewContract(contract)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-primary"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                                                            <button onClick={() => handleDownloadPDF(contract)} className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"><span className="material-symbols-outlined text-[18px]">download</span></button>
                                                            <button onClick={() => handleDelete(contract.id)} className="p-1.5 rounded hover:bg-rose-100 text-rose-500"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {viewMode === 'create' && (
                        <div className="bg-white dark:bg-[#1a1d23] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                             <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d23] flex items-center gap-3">
                                <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                    <span className="material-symbols-outlined text-xl">post_add</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</h2>
                                    <p className="text-sm text-slate-500">Preencha os dados para gerar o documento jurídico.</p>
                                </div>
                            </div>

                             <form onSubmit={handleCreateSubmit} className="p-8 space-y-8">
                                 {creationStep === 'form' ? (
                                     <>
                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                             {Object.values(dynamicTemplates).map((tmpl: any) => (
                                                 <div
                                                     key={tmpl.id}
                                                     onClick={() => setSelectedTemplate(tmpl.id)}
                                                     className={`cursor-pointer p-5 rounded-xl border-2 transition-all ${selectedTemplate === tmpl.id ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                                 >
                                                     <h4 className="font-bold text-sm leading-tight">{tmpl.title}</h4>
                                                     <p className="text-[10px] text-slate-500 mt-2">{tmpl.desc || 'Modelo de contrato'}</p>
                                                 </div>
                                             ))}
                                         </div>

                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Imóvel</label>
                                                 <select required className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.propertyId} onChange={e => setFormData({ ...formData, propertyId: e.target.value })}>
                                                     <option value="">Selecione...</option>
                                                     {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                                 </select>
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Cliente</label>
                                                 <select required className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })}>
                                                     <option value="">Selecione...</option>
                                                     {users.filter(u => u.role === 'client').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                 </select>
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Proprietário</label>
                                                 <select required className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.ownerId} onChange={e => setFormData({ ...formData, ownerId: e.target.value })}>
                                                     <option value="">Selecione...</option>
                                                     {users.filter(u => u.role === 'owner' || u.role === 'admin').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                 </select>
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Valor (R$)</label>
                                                 <input type="number" required className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} />
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Data de Início</label>
                                                 <input type="date" required className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Data de Fim</label>
                                                 <input type="date" className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                             </div>
                                         </div>
                                     </>
                                 ) : (
                                     <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                         <div className="flex items-center justify-between">
                                             <label className="text-xs font-bold text-slate-500 uppercase">Edição Final do Documento</label>
                                             <button type="button" onClick={() => setCreationStep('form')} className="text-xs text-primary font-bold flex items-center gap-1">
                                                 <span className="material-symbols-outlined text-sm">edit</span> Alterar Dados
                                             </button>
                                         </div>
                                         <textarea 
                                             className="w-full min-h-[300px] max-h-[70vh] h-[500px] p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 font-serif text-sm leading-relaxed focus:outline-none focus:border-primary/50"
                                             value={currentText}
                                             onChange={(e) => setCurrentText(e.target.value)}
                                         />
                                         <p className="text-[10px] text-slate-400">Você pode revisar e alterar qualquer parte do texto acima antes de finalizar o contrato.</p>
                                     </div>
                                 )}

                                 <div className="flex gap-4 pt-6">
                                     <button type="button" onClick={() => { setViewMode('list'); setCreationStep('form'); }} className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                                     <button type="submit" className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-colors">
                                         {creationStep === 'form' ? 'Revisar Documento' : (editingContract ? 'Salvar Alterações' : 'Finalizar e Gerar Contrato')}
                                     </button>
                                 </div>
                             </form>
                        </div>
                    )}

                    {viewMode === 'view' && viewingContract && (
                        <div className="flex flex-col lg:flex-row gap-8 h-full min-h-0">
                            {/* Document Preview (A4 Simulado) */}
                            <div ref={previewContainerRef} className="flex-1 rounded-2xl p-4 lg:p-8 overflow-x-auto overflow-y-auto flex justify-start lg:justify-center bg-slate-200/50 dark:bg-black/20 custom-scrollbar relative">
                                
                                <div id="printable-area" className="flex flex-col gap-0 items-center" style={{ transform: `scale(${a4Scale})`, transformOrigin: 'top center', minWidth: a4Scale < 1 ? '210mm' : undefined }}>
                                    {isEditingText ? (
                                        <div className="bg-white text-black w-[210mm] min-h-[297mm] shadow-2xl relative mx-auto flex flex-col p-[25mm]">
                                            <textarea
                                                className="w-full h-full min-h-[600px] p-4 text-justify text-[11pt] leading-relaxed font-serif whitespace-pre-wrap bg-slate-50 focus:outline-none border-2 border-dashed border-primary/30 rounded-xl"
                                                value={currentText}
                                                onChange={(e) => setCurrentText(e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        (() => {
                                            const CHARS_PER_PAGE = 3000;
                                            const paragraphs = currentText.split('\n');
                                            const pages: string[] = [];
                                            let currentPage = '';

                                            paragraphs.forEach(p => {
                                                if ((currentPage + p).length > CHARS_PER_PAGE) {
                                                    pages.push(currentPage);
                                                    currentPage = p + '\n';
                                                } else {
                                                    currentPage += p + '\n';
                                                }
                                            });
                                            if (currentPage) pages.push(currentPage);

                                            return pages.map((content, idx) => (
                                                <div key={idx} className="bg-white text-black w-[210mm] min-h-[297mm] shadow-2xl relative mx-auto flex flex-col mb-10 last:mb-0 contract-page p-[25mm]">
                                                    {/* Custom A4 Layout for each page */}
                                                    {idx === 0 && (
                                                        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-10">
                                                            {AGENCY.logo ? <img src={AGENCY.logo} className="h-16 object-contain" alt="Logo" /> : <div className="h-16 w-16 bg-slate-100 rounded-xl flex items-center justify-center"><span className="text-slate-400 font-bold text-lg">{AGENCY.name.charAt(0)}</span></div>}
                                                            <div className="text-right">
                                                                <h2 className="text-lg font-black uppercase tracking-tight">{AGENCY.name}</h2>
                                                                <p className="text-[10px] text-slate-500">{AGENCY.cnpj} | {AGENCY.creci}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {idx === 0 && (
                                                        <h1 className="text-center font-bold text-xl uppercase mb-10 underline decoration-double">
                                                            {CONTRACT_TEMPLATES[viewingContract.templateType || 'rent_residential']?.title}
                                                        </h1>
                                                    )}

                                                    <div className="text-justify text-[11pt] leading-relaxed font-serif whitespace-pre-wrap flex-1">
                                                        {content}
                                                    </div>

                                                    {idx === pages.length - 1 && (
                                                        <div className="mt-12 pt-10">
                                                            <p className="text-right mb-16 font-serif italic text-sm">São Paulo, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                                                            
                                                            <div className="grid grid-cols-2 gap-8 mt-10">
                                                                 <div className="text-center">
                                                                     <div className="h-20 flex flex-col items-center justify-center mb-2">
                                                                         {viewingContract.ownerSignatureImage ? (
                                                                             <img src={viewingContract.ownerSignatureImage} className="h-8 object-contain" alt="Assinatura Imobiliária" />
                                                                         ) : AGENCY.stampUrl ? (
                                                                             <img src={AGENCY.stampUrl} className="h-8 object-contain" alt="Rubrica" />
                                                                         ) : (
                                                                             <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">[Pendente]</span>
                                                                         )}
                                                                     </div>
                                                                     <div className="border-t border-black w-full pt-1">
                                                                         <p className="font-bold text-[10px] uppercase">{AGENCY.stampName}</p>
                                                                         <p className="text-[9px]">Imobiliária</p>
                                                                     </div>
                                                                 </div>
                                                                 <div className="text-center">
                                                                     <div className="h-14 flex flex-col items-center justify-center mb-2">
                                                                         {viewingContract.signatureImage ? (
                                                                             <img src={viewingContract.signatureImage} className="h-14 object-contain" alt="Assinatura" />
                                                                         ) : (
                                                                              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">[Pendente]</span>
                                                                         )}
                                                                     </div>
                                                                     <div className="border-t border-black w-full pt-1">
                                                                         <p className="font-bold text-[10px] uppercase">{viewingContract.clientName}</p>
                                                                         <p className="text-[9px]">Contratante</p>
                                                                     </div>
                                                                 </div>
                                                             </div>
                                                        </div>
                                                    )}

                                                    <div className="mt-auto pt-6 text-center text-[9px] text-slate-300 border-t border-slate-50">
                                                        Página {idx + 1} de {pages.length} | Documento #{viewingContract.id} | EstateFlow Suite
                                                    </div>

                                                    {viewingContract.signatureStatus !== 'signed' && (
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-45 select-none">
                                                            <span className="text-[140px] font-black border-[20px] border-black p-20 rounded-3xl">RASCUNHO</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ));
                                        })()
                                    )}
                                </div>
                            </div>

                            {/* Sidebar Actions */}
                            <div className="w-full lg:w-80 flex flex-col gap-4 no-print">
                                <div className="bg-white dark:bg-[#1a1d23] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
                                    <h3 className="font-bold text-lg mb-4">Ações Jurídicas</h3>
                                    
                                    <div className="flex flex-col gap-3">
                                        {isEditingText ? (
                                            <>
                                                <button onClick={handleSaveEdit} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all">
                                                    <span className="material-symbols-outlined">save</span> Salvar Texto
                                                </button>
                                                <button onClick={() => { setIsEditingText(false); setCurrentText(generatedBody); }} className="w-full py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">
                                                    Cancelar
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={handlePrint} className="w-full py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                                                    <span className="material-symbols-outlined">print</span> Imprimir / Exportar PDF
                                                </button>

                                                <button onClick={() => setIsSignatureModalOpen(true)} className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-all">
                                                    <span className="material-symbols-outlined">draw</span> Assinar como Contratante
                                                </button>
                                                <button onClick={() => setIsOwnerSignatureModalOpen(true)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
                                                    <span className="material-symbols-outlined">draw</span> Assinar como Imobiliária
                                                </button>

                                                <button onClick={() => handleDownloadPDF(viewingContract)} className="w-full py-3 border border-primary text-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">
                                                    <span className="material-symbols-outlined">download</span> Gerar PDF Profissional
                                                </button>

                                                <button onClick={handleSaveContract} disabled={isSavingContract} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50">
                                                    {isSavingContract ? (
                                                        <><span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Salvando...</>
                                                    ) : (
                                                        <><span className="material-symbols-outlined">save</span> Salvar Contrato</>
                                                    )}
                                                </button>

                                                <button onClick={handleSendForSignature} disabled={isSendingEmail} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50">
                                                    {isSendingEmail ? (
                                                        <><span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Enviando...</>
                                                    ) : (
                                                        <><span className="material-symbols-outlined">send</span> Enviar para Assinatura</>
                                                    )}
                                                </button>

                                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

                                                <button onClick={() => setIsEditingText(true)} className="w-full py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm">
                                                    <span className="material-symbols-outlined text-[18px]">edit_note</span> Editar Cláusulas
                                                </button>

                                            </>
                                        )}
                                    </div>

                                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800">
                                        <p className="text-[10px] text-amber-600 font-bold uppercase mb-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">shield_person</span> Segurança de Dados
                                        </p>
                                        <p className="text-[11px] text-amber-800 dark:text-amber-500 leading-tight">
                                            Assinaturas colhidas são criptografadas e vinculadas ao CPF do signatário para validade jurídica plena (MP 2.200-2/2001).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Signature Modal - Cliente */}
            {isSignatureModalOpen && (
                <SignaturePad 
                    onSave={handleSignatureSave}
                    onCancel={() => setIsSignatureModalOpen(false)}
                />
            )}
            {/* Signature Modal - Proprietario */}
            {isOwnerSignatureModalOpen && (
                <SignaturePad 
                    onSave={handleOwnerSignatureSave}
                    onCancel={() => setIsOwnerSignatureModalOpen(false)}
                />
            )}
        </div>
    );
};

export default ContractsPage;
