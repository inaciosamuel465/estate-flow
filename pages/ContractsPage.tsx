import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Contract, Property, User } from '../src/types';
import { addContract, deleteContract, updateContract } from '../src/services/dataService';
import { generateContractPDF, downloadPdfBlob } from '../src/services/pdfService';
import SignaturePad from '../components/SignaturePad';
import { OFFICIAL_CONTRACT_TEMPLATES, buildContractPlaceholders, templateToContractType } from '../src/contracts/templates';

// --- Dados da ImobiliÃ¡ria (dinÃ¢mico via settings) ---
const getAgencyInfo = (settings?: Record<string, string>) => ({
    name: settings?.companyName || "EstateFlow NegÃ³cios ImobiliÃ¡rios Ltda.",
    stampUrl: settings?.agencyStampUrl || '',
    stampName: settings?.agencyStampName || settings?.companyName || "EstateFlow NegÃ³cios ImobiliÃ¡rios Ltda.",
    cnpj: settings?.agencyCnpj || "12.345.678/0001-90",
    creci: settings?.agencyCreci || "J-12345",
    address: settings?.address || "Av. Paulista, 1000, 15Âº Andar - Jardins, SÃ£o Paulo - SP",
    phone: settings?.contactPhone || "(11) 3000-0000",
    email: settings?.contactEmail || "juridico@estateflow.com",
    logo: settings?.logoUrl || ""
});

// --- Templates JurÃ­dicos Profissionais e Detalhados ---
const LEGACY_CONTRACT_TEMPLATES = {
    rent_residential: {
        id: 'rent_residential',
        title: 'LocaÃ§Ã£o Residencial (AdministraÃ§Ã£o)',
        desc: 'Contrato completo entre Locador (via ImobiliÃ¡ria) e LocatÃ¡rio.',
        content: `CONTRATO DE LOCAÃ‡ÃƒO RESIDENCIAL POR PRAZO DETERMINADO, COM ADMINISTRAÃ‡ÃƒO IMOBILIÃRIA

Pelo presente instrumento particular, as partes a seguir qualificadas:

CLÃUSULA PRIMEIRA - DAS PARTES E QUALIFICAÃ‡ÃƒO

1.1. LOCADOR: O proprietÃ¡rio do imÃ³vel, devidamente cadastrado no sistema da ADMINISTRADORA, doravante denominado simplesmente LOCADOR, neste ato representado por sua administradora imobiliÃ¡ria.

1.2. ADMINISTRADORA: {{AGENCY_NAME}}, pessoa jurÃ­dica de direito privado, inscrita no CNPJ/MF sob nÂº {{AGENCY_CNPJ}}, com sede na {{AGENCY_ADDRESS}}, devidamente registrada no Conselho Regional de Corretores de ImÃ³veis - CRECI sob nÂº {{AGENCY_CRECI}}, neste ato representada por seu representante legal, doravante denominada simplesmente ADMINISTRADORA.

1.3. LOCATÃRIO: {{CLIENT_NAME}}, nacionalidade, estado civil, profissÃ£o, portador(a) da CÃ©dula de Identidade RG nÂº [RG], inscrito(a) no CPF/MF sob nÂº {{CLIENT_DOC}}, residente e domiciliado(a) Ã  {{CLIENT_ADDR}}, doravante denominado simplesmente LOCATÃRIO.

1.4. FIADOR(ES): [Nome do fiador], [nacionalidade], [estado civil], [profissÃ£o], portador(a) da CI/RG nÂº [RG], inscrito(a) no CPF/MF sob nÂº [CPF], residente e domiciliado(a) Ã  [EndereÃ§o] que neste ato, na qualidade de FIADOR, assume solidariamente com o LOCATÃRIO todas as obrigaÃ§Ãµes decorrentes deste contrato, nos termos do parÃ¡grafo Ãºnico do art. 818 e art. 819 do CÃ³digo Civil Brasileiro, renunciando expressamente ao benefÃ­cio de ordem e concordando em ser notificado pessoalmente para todos os atos processuais.

CLÃUSULA SEGUNDA - DO OBJETO E DESTINAÃ‡ÃƒO DO IMÃ“VEL

2.1. O presente contrato tem por objeto a locaÃ§Ã£o do imÃ³vel residencial constituÃ­do de [descriÃ§Ã£o resumida], situado Ã  {{PROPERTY_ADDR}}, com Ã¡rea total de [Ã¡rea]mÂ², devidamente registrado sob matrÃ­cula nÂº [matrÃ­cula] do CartÃ³rio de Registro de ImÃ³veis da Comarca de {{PROPERTY_CITY}}, doravante denominado simplesmente IMÃ“VEL.

2.2. O IMÃ“VEL destina-se, Ãºnica e exclusivamente, Ã  residÃªncia do LOCATÃRIO e de seu nÃºcleo familiar, sendo expressamente proibida a sua utilizaÃ§Ã£o para fins comerciais, profissionais, industriais ou associativos, sob pena de rescisÃ£o contratual imediata e aplicaÃ§Ã£o da multa prevista na ClÃ¡usula DÃ©cima Segunda.

2.3. O LOCATÃRIO declara, sob as penas da lei, que:
a) Vistoriou pessoalmente o IMÃ“VEL e o recebe em perfeitas condiÃ§Ãµes de habitabilidade, seguranÃ§a e conservaÃ§Ã£o;
b) EstÃ¡ ciente de todas as caracterÃ­sticas fÃ­sicas do IMÃ“VEL, incluindo suas dimensÃµes, estado de conservaÃ§Ã£o de pisos, paredes, instalaÃ§Ãµes elÃ©tricas, hidrÃ¡ulicas, esquadrias, vidros e demais componentes;
c) Aceita o IMÃ“VEL no estado em que se encontra, obrigando-se a mantÃª-lo e restituÃ­-lo nas mesmas condiÃ§Ãµes, ressalvado o desgaste natural decorrente do uso regular e moderado.

CLÃUSULA TERCEIRA - DO PRAZO E VIGÃŠNCIA CONTRATUAL

3.1. O prazo da locaÃ§Ã£o Ã© de 30 (trinta) meses, com inÃ­cio em {{START_DATE}} e tÃ©rmino em {{END_DATE}}, podendo ser prorrogado por prazo indeterminado na forma do art. 46 da Lei nÂº 8.245/91 (Lei do Inquilinato).

3.2. Findo o prazo estipulado, se nenhuma das partes manifestar, no prazo legal, o interesse de nÃ£o renovar, a locaÃ§Ã£o prorrogar-se-Ã¡ automaticamente por prazo indeterminado, mantidas as demais condiÃ§Ãµes e obrigaÃ§Ãµes pactuadas neste instrumento.

3.3. Em se tratando de locaÃ§Ã£o por prazo indeterminado, qualquer das partes poderÃ¡ denunciar o contrato mediante notificaÃ§Ã£o escrita com antecedÃªncia mÃ­nima de 30 (trinta) dias, nos termos do art. 6Âº da Lei nÂº 8.245/91.

3.4. O LOCATÃRIO obriga-se a restituir o IMÃ“VEL inteiramente livre e desocupado de pessoas e bens, nas mesmas condiÃ§Ãµes em que o recebeu, no prazo mÃ¡ximo de 15 (quinze) dias contados do tÃ©rmino do prazo contratual ou da denÃºncia, sob pena de incorrer em aluguel e encargos proporcionais pelo perÃ­odo de retenÃ§Ã£o, alÃ©m das penalidades cabÃ­veis.

CLÃUSULA QUARTA - DO VALOR DO ALUGUEL, REAJUSTE E FORMA DE PAGAMENTO

4.1. O aluguel mensal Ã© fixado em R$ {{VALUE}} ({{VALUE_EXTENSO}}), que o LOCATÃRIO se obriga a pagar pontualmente atÃ© o dia {{DUE_DAY}} de cada mÃªs subsequente ao vencido, diretamente Ã  ADMINISTRADORA ou por meio de boleto bancÃ¡rio, PIX ou outro meio de pagamento por ela disponibilizado.

4.2. O nÃ£o recebimento do boleto bancÃ¡rio atÃ© a data do vencimento nÃ£o exime o LOCATÃRIO da obrigaÃ§Ã£o de pagar pontualmente o aluguel e encargos, devendo o LOCATÃRIO solicitar a segunda via ou efetuar o pagamento diretamente na sede da ADMINISTRADORA.

4.3. O aluguel serÃ¡ reajustado anualmente, no mÃªs de aniversÃ¡rio do presente contrato, aplicando-se a variaÃ§Ã£o acumulada do Ãndice Geral de PreÃ§os do Mercado - IGP-M, apurado e divulgado pela FundaÃ§Ã£o GetÃºlio Vargas - FGV, ou na hipÃ³tese de extinÃ§Ã£o deste Ã­ndice, pelo que vier a substituÃ­-lo.

4.4. Na hipÃ³tese de o Ã­ndice de reajuste nÃ£o refletir adequadamente a variaÃ§Ã£o do poder aquisitivo da moeda, as partes poderÃ£o, de comum acordo, eleger outro Ã­ndice oficial que melhor atenda aos interesses recÃ­procos.

4.5. O atraso no pagamento do aluguel ou de qualquer encargo locatÃ­cio, total ou parcial, implicarÃ¡ a incidÃªncia cumulativa de:
a) Multa moratÃ³ria de 2% (dois por cento) sobre o valor do dÃ©bito atualizado;
b) Juros de mora de 1% (um por cento) ao mÃªs, calculados pro rata die;
c) CorreÃ§Ã£o monetÃ¡ria pelo IGP-M/FGV ou Ã­ndice contratualmente previsto, calculada pro rata die, desde a data do vencimento atÃ© a data do efetivo pagamento.

4.6. O LOCATÃRIO autoriza, desde jÃ¡, a inscriÃ§Ã£o de seu nome e de seu(s) fiador(es) nos Ã³rgÃ£os de proteÃ§Ã£o ao crÃ©dito (SPC, SERASA, CADIN e congÃªneres) em caso de inadimplemento superior a 30 (trinta) dias, independentemente de notificaÃ§Ã£o judicial ou extrajudicial, nos termos do art. 43 do CÃ³digo de Defesa do Consumidor e SÃºmula 322 do STJ.

4.7. O dÃ©bito decorrente da inadimplÃªncia do LOCATÃRIO, incluÃ­dos aluguÃ©is, encargos, multas, juros, correÃ§Ã£o monetÃ¡ria, honorÃ¡rios advocatÃ­cios e custas processuais, poderÃ¡ ser objeto de aÃ§Ã£o de execuÃ§Ã£o extrajudicial nos termos do art. 784 do CÃ³digo de Processo Civil, por constituir tÃ­tulo executivo extrajudicial.

CLÃUSULA QUINTA - DOS ENCARGOS E OBRIGAÃ‡Ã•ES TRIBUTÃRIAS

5.1. AlÃ©m do aluguel, correrÃ£o por conta exclusiva do LOCATÃRIO, durante todo o perÃ­odo da locaÃ§Ã£o:
a) Imposto Predial e Territorial Urbano - IPTU e taxa de coleta de lixo, calculados pro rata tempore quando do recebimento ou devoluÃ§Ã£o do IMÃ“VEL;
b) Taxas municipais, estaduais ou federais que incidam ou venham a incidir sobre o IMÃ“VEL;
c) Despesas ordinÃ¡rias de condomÃ­nio, rateadas na forma da respectiva ConvenÃ§Ã£o de CondomÃ­nio, incluindo taxa de manutenÃ§Ã£o, salÃ¡rios, encargos sociais dos funcionÃ¡rios, energia, Ã¡gua e gÃ¡s das Ã¡reas comuns, seguro obrigatÃ³rio e fundo de reserva ordinÃ¡rio;
d) Consumo de Ã¡gua, luz, gÃ¡s, internet, telefone, TV por assinatura e demais serviÃ§os de utilidade pÃºblica medidos por relÃ³gio ou consumo prÃ³prio;
e) PrÃªmio de seguro contra incÃªndio, danos elÃ©tricos, vendaval, desmoronamento e responsabilidade civil, conforme exige o art. 23, inciso VII, da Lei nÂº 8.245/91, a ser contratado pela ADMINISTRADORA em nome do LOCADOR, com valor rateado nas contas mensais.

5.2. As despesas extraordinÃ¡rias de condomÃ­nio, assim definidas no art. 22 da Lei nÂº 8.245/91 (tais como obras estruturais, pintura externa, impermeabilizaÃ§Ã£o, substituiÃ§Ã£o de elevador, indenizaÃ§Ãµes trabalhistas e fundo de reserva), serÃ£o de responsabilidade do LOCADOR.

5.3. O LOCATÃRIO compromete-se a manter o IMÃ“VEL permanentemente segurado contra incÃªndio, mediante apÃ³lice compatÃ­vel com o valor venal do IMÃ“VEL, sendo certo que a inadimplÃªncia do prÃªmio autoriza a ADMINISTRADORA a contratar o seguro e cobrar o valor nas contas mensais.

CLÃUSULA SEXTA - DA MANUTENÃ‡ÃƒO, REPAROS E CONSERVAÃ‡ÃƒO DO IMÃ“VEL

6.1. SÃ£o considerados pequenos reparos e manutenÃ§Ãµes de responsabilidade do LOCATÃRIO, nos termos do art. 23, Inciso III, da Lei nÂº 8.245/91:
a) Troca de lÃ¢mpadas, luminÃ¡rias, reatores e interruptores;
b) Reparos em fechaduras, maÃ§anetas, dobradiÃ§as e trincos;
c) Desentupimento de pias, tanques, ralos e vasos sanitÃ¡rios;
d) Troca de vedaÃ§Ã£o de torneiras, registros e vÃ¡lvulas de descarga;
e) Troca de vidros, espelhos e boxes, quando decorrentes de uso inadequado;
f) Pintura interna de paredes, quando necessÃ¡ria por desgaste anormal;
g) Reparos em armÃ¡rios embutidos, bancadas e tampos;
h) ManutenÃ§Ã£o de aparelhos sanitÃ¡rios e metais;
i) Pequenos reparos na rede elÃ©trica (troca de tomadas, disjuntores simples);
j) DedetizaÃ§Ã£o e desinsetizaÃ§Ã£o periÃ³dicas, quando necessÃ¡rio.

6.2. SÃ£o considerados reparos estruturais e de responsabilidade do LOCADOR:
a) InfiltraÃ§Ãµes e vazamentos na estrutura da edificaÃ§Ã£o;
b) Problemas na rede elÃ©trica principal e quadros de distribuiÃ§Ã£o;
c) Trincas e rachaduras estruturais em paredes, vigas e lajes;
d) Problemas na rede hidrossanitÃ¡ria embutida em paredes e pisos;
e) Troca de telhas e reparos no telhado quando nÃ£o decorrentes de uso inadequado;
f) Problemas no sistema de impermeabilizaÃ§Ã£o de lajes e Ã¡reas molhadas;
g) Problemas estruturais em esquadrias quando nÃ£o decorrentes de mau uso.

6.3. Para a realizaÃ§Ã£o de reparos estruturais, o LOCATÃRIO deverÃ¡ comunicar formalmente a ADMINISTRADORA, que providenciarÃ¡ o reparo no prazo mÃ¡ximo de 30 (trinta) dias, salvo situaÃ§Ãµes emergenciais que demandem intervenÃ§Ã£o imediata.

6.4. O LOCATÃRIO nÃ£o poderÃ¡, sem prÃ©via e expressa autorizaÃ§Ã£o por escrito do LOCADOR e/ou ADMINISTRADORA:
a) Realizar obras, modificaÃ§Ãµes, benfeitorias ou alteraÃ§Ãµes estruturais no IMÃ“VEL;
b) Furar, quebrar ou alterar paredes, pisos, tetos ou fachadas;
c) Instalar equipamentos que exijam modificaÃ§Ãµes na rede elÃ©trica ou hidrÃ¡ulica;
d) Modificar a pintura externa ou a fachada do IMÃ“VEL.

6.5. As benfeitorias necessÃ¡rias introduzidas pelo LOCATÃRIO e nÃ£o realizadas pelo LOCADOR apÃ³s notificaÃ§Ã£o serÃ£o indenizadas na forma do art. 35 da Lei nÂº 8.245/91, mediante comprovaÃ§Ã£o das despesas.

6.6. As benfeitorias voluptuÃ¡rias ou Ãºteis realizadas sem autorizaÃ§Ã£o prÃ©via por escrito poderÃ£o ser retidas ou levantadas pelo LOCATÃRIO, desde que nÃ£o danifiquem o IMÃ“VEL, ou incorporadas ao imÃ³vel sem direito a indenizaÃ§Ã£o, a critÃ©rio do LOCADOR.

CLÃUSULA SÃ‰TIMA - DA VISTORIA E DO LAUDO DE VISTORIA

7.1. SerÃ¡ lavrado Laudo de Vistoria, em duas vias, descrevendo minuciosamente o estado do IMÃ“VEL, com registro fotogrÃ¡fico de todos os cÃ´modos, instalaÃ§Ãµes, equipamentos e acabamentos, no ato da entrega das chaves e no momento da devoluÃ§Ã£o.

7.2. O LOCATÃRIO declara receber uma via do Laudo de Vistoria de Entrada, concordando com seu conteÃºdo e firmando-o juntamente com a ADMINISTRADORA.

7.3. Por ocasiÃ£o da devoluÃ§Ã£o do IMÃ“VEL, serÃ¡ realizado novo Laudo de Vistoria de SaÃ­da, que confrontarÃ¡ as condiÃ§Ãµes atuais com as registradas no Laudo de Entrada.

7.4. Os reparos eventualmente necessÃ¡rios para recomposiÃ§Ã£o do IMÃ“VEL ao estado do recebimento (exceto desgaste natural) serÃ£o comunicados por escrito ao LOCATÃRIO, que terÃ¡ o prazo de 15 (quinze) dias para realizÃ¡-los ou reembolsar os valores correspondentes.

7.5. Na omissÃ£o do LOCATÃRIO, a ADMINISTRADORA estÃ¡ autorizada a realizar os reparos e cobrar do LOCATÃRIO os valores despendidos, corrigidos monetariamente.

CLÃUSULA OITAVA - DA SUBCLOCAÃ‡ÃƒO, CESSÃƒO E TRANSFERÃŠNCIA

8.1. Ã‰ vedado ao LOCATÃRIO ceder, sublocar, emprestar, doar ou transferir, total ou parcialmente, os direitos e obrigaÃ§Ãµes decorrentes deste contrato, sob qualquer tÃ­tulo, sem o prÃ©vio e expresso consentimento por escrito do LOCADOR.

8.2. A infringÃªncia ao disposto nesta clÃ¡usula autoriza a rescisÃ£o imediata do contrato, independentemente de notificaÃ§Ã£o, aplicando-se a multa prevista na ClÃ¡usula DÃ©cima Segunda, sem prejuÃ­zo da cobranÃ§a dos aluguÃ©is e encargos vincendos.

8.3. Ã‰ igualmente vedado ao LOCATÃRIO hospedar pessoas estranhas ao nÃºcleo familiar por perÃ­odo superior a 30 (trinta) dias consecutivos ou 60 (sessenta) dias alternados em um ano, salvo autorizaÃ§Ã£o expressa do LOCADOR.

CLÃUSULA NONA - DAS OBRIGAÃ‡Ã•ES DO LOCATÃRIO

9.1. Sem prejuÃ­zo das demais obrigaÃ§Ãµes previstas neste contrato e na legislaÃ§Ã£o aplicÃ¡vel, constituem obrigaÃ§Ãµes do LOCATÃRIO:
a) Utilizar o IMÃ“VEL para fins exclusivamente residenciais, conforme ClÃ¡usula Segunda;
b) Pagar pontualmente o aluguel e todos os encargos previstos neste contrato;
c) Conservar o IMÃ“VEL no mais rigoroso estado de limpeza, higiene e conservaÃ§Ã£o;
d) Cumprir integralmente as normas e regulamentos do condomÃ­nio, se houver;
e) Responsabilizar-se por danos causados ao IMÃ“VEL por si, seus familiares, visitantes, empregados ou prestadores de serviÃ§o;
f) Comunicar imediatamente Ã  ADMINISTRADORA qualquer anormalidade verificada no IMÃ“VEL;
g) Permitir a entrada de tÃ©cnicos e profissionais para vistorias, reparos ou manutenÃ§Ãµes, mediante prÃ©vio agendamento;
h) Manter atualizado seu endereÃ§o e contatos junto Ã  ADMINISTRADORA;
i) Restituir o IMÃ“VEL nas condiÃ§Ãµes em que o recebeu, conforme ClÃ¡usula SÃ©tima;
j) NÃ£o praticar atos que perturbem a tranquilidade e o sossego dos vizinhos.

CLÃUSULA DÃ‰CIMA - DAS OBRIGAÃ‡Ã•ES DO LOCADOR/ADMINISTRADORA

10.1. Constituem obrigaÃ§Ãµes do LOCADOR, representado pela ADMINISTRADORA:
a) Garantir ao LOCATÃRIO o uso pacÃ­fico e contÃ­nuo do IMÃ“VEL durante toda a locaÃ§Ã£o;
b) Realizar reparos estruturais de sua competÃªncia, conforme ClÃ¡usula Sexta;
c) Responder pelos vÃ­cios ou defeitos ocultos do IMÃ“VEL existentes Ã  data da locaÃ§Ã£o;
d) Efetuar o pagamento das despesas extraordinÃ¡rias de condomÃ­nio;
e) Manter a ADMINISTRADORA devidamente habilitada perante o CRECI;
f) Disponibilizar ao LOCATÃRIO os comprovantes de pagamento de IPTU e demais tributos.

CLÃUSULA DÃ‰CIMA PRIMEIRA - DO CONDOMÃNIO

11.1. O LOCATÃRIO obriga-se a cumprir fielmente a ConvenÃ§Ã£o de CondomÃ­nio, o Regulamento Interno e as deliberaÃ§Ãµes das assembleias condominiais.

11.2. O LOCATÃRIO responsabiliza-se por infraÃ§Ãµes, multas e penalidades aplicadas pelo condomÃ­nio em decorrÃªncia de atos seus, de seus familiares, visitantes ou prestadores de serviÃ§o.

11.3. A ADMINISTRADORA nÃ£o se responsabiliza por questÃµes internas do condomÃ­nio, cabendo ao LOCATÃRIO dirimi-las diretamente com o sÃ­ndico ou administradora do condomÃ­nio.

CLÃUSULA DÃ‰CIMA SEGUNDA - DA RESCISÃƒO ANTECIPADA E MULTA CONTRATUAL

12.1. A rescisÃ£o antecipada do contrato, a pedido do LOCATÃRIO, antes de transcorridos 12 (doze) meses de vigÃªncia, implicarÃ¡ o pagamento de multa compensatÃ³ria equivalente a 03 (trÃªs) aluguÃ©is vigentes Ã  Ã©poca da rescisÃ£o, reduzida proporcionalmente ao tempo restante do prazo contratual, nos termos do art. 4Âº, parÃ¡grafo Ãºnico, da Lei nÂº 8.245/91.

12.2. O descumprimento de qualquer obrigaÃ§Ã£o contratual pelo LOCATÃRIO, apÃ³s notificaÃ§Ã£o escrita com prazo de 15 (quinze) dias para regularizaÃ§Ã£o, autoriza a rescisÃ£o imediata do contrato, aplicando-se multa de 03 (trÃªs) aluguÃ©is vigentes, sem prejuÃ­zo da cobranÃ§a dos valores em atraso.

12.3. Em caso de despejo judicial, o LOCATÃRIO arcarÃ¡ integralmente com todas as custas processuais, honorÃ¡rios advocatÃ­cios de sucumbÃªncia (fixados em 20% sobre o valor da causa) e demais despesas decorrentes da aÃ§Ã£o.

12.4. A multa prevista nesta clÃ¡usula nÃ£o obsta a cobranÃ§a dos aluguÃ©is e encargos vencidos e nÃ£o pagos, que serÃ£o exigÃ­veis cumulativamente.

CLÃUSULA DÃ‰CIMA TERCEIRA - DAS GARANTIAS LOCATÃCIAS

13.1. Como garantia do fiel cumprimento de todas as obrigaÃ§Ãµes decorrentes deste contrato, o LOCATÃRIO oferece, a critÃ©rio do LOCADOR:
[Indicar a modalidade de garantia escolhida: CauÃ§Ã£o em Dinheiro / TÃ­tulo de CapitalizaÃ§Ã£o / Seguro-FianÃ§a / FianÃ§a]

13.2. A garantia prestada cobrirÃ¡ todos os dÃ©bitos do LOCATÃRIO, incluindo aluguÃ©is, encargos, multas, juros, correÃ§Ã£o monetÃ¡ria, honorÃ¡rios advocatÃ­cios e custas processuais.

13.3. Em caso de fianÃ§a, o FIADOR declara ciÃªncia de todas as clÃ¡usulas deste contrato, responsabilizando-se solidariamente pelo cumprimento de todas as obrigaÃ§Ãµes, renunciando expressamente ao benefÃ­cio de ordem (art. 827 CC) e concordando com a notificaÃ§Ã£o pessoal para todos os atos processuais (art. 819 CC).

CLÃUSULA DÃ‰CIMA QUARTA - DO DIREITO DE PREFERÃŠNCIA

14.1. Em caso de venda ou promessa de venda do IMÃ“VEL, o LOCATÃRIO terÃ¡ preferÃªncia para adquiri-lo nas mesmas condiÃ§Ãµes ofertadas a terceiros, devendo ser notificado por escrito com antecedÃªncia mÃ­nima de 60 (sessenta) dias, nos termos do art. 27 e seguintes da Lei nÂº 8.245/91.

14.2. O LOCATÃRIO deverÃ¡ manifestar seu interesse por escrito no prazo de 30 (trinta) dias contados do recebimento da notificaÃ§Ã£o, sob pena de decadÃªncia do direito de preferÃªncia.

CLÃUSULA DÃ‰CIMA QUINTA - DA RESPONSABILIDADE POR DANOS E MULTAS ADMINISTRATIVAS

15.1. O LOCATÃRIO Ã© integralmente responsÃ¡vel por todos os danos materiais e morais causados ao IMÃ“VEL, Ã s Ã¡reas comuns, aos vizinhos ou a terceiros, decorrentes de sua conduta, de seus familiares, visitantes, empregados ou prestadores de serviÃ§o.

15.2. Multas administrativas, ambientais ou de qualquer natureza aplicadas ao IMÃ“VEL em decorrÃªncia de atos ou omissÃµes do LOCATÃRIO serÃ£o de sua exclusiva responsabilidade.

CLÃUSULA DÃ‰CIMA SEXTA - DAS NOTIFICAÃ‡Ã•ES E COMUNICAÃ‡Ã•ES

16.1. As partes elegem como vÃ¡lidas e eficazes todas as notificaÃ§Ãµes, intimaÃ§Ãµes e comunicaÃ§Ãµes enviadas por meio eletrÃ´nico (e-mail), aplicativos de mensagens instantÃ¢neas (WhatsApp), plataforma digital do sistema, ou correspondÃªncia fÃ­sica, para os endereÃ§os e contatos informados no ato da contrataÃ§Ã£o ou posteriormente atualizados.

16.2. As comunicaÃ§Ãµes serÃ£o consideradas recebidas:
a) Imediatamente, quando enviadas por e-mail ou WhatsApp em dias Ãºteis em horÃ¡rio comercial;
b) ApÃ³s 48 (quarenta e oito) horas do envio, quando enviadas por correspondÃªncia fÃ­sica;
c) No momento da visualizaÃ§Ã£o, quando veiculadas na plataforma digital do sistema.

CLÃUSULA DÃ‰CIMA SÃ‰TIMA - DA PROTEÃ‡ÃƒO DE DADOS PESSOAIS (LGPD)

17.1. As partes comprometem-se a tratar os dados pessoais uma da outra em conformidade com a Lei Geral de ProteÃ§Ã£o de Dados Pessoais (Lei nÂº 13.709/2018), observando os seguintes princÃ­pios:
a) Finalidade: os dados serÃ£o utilizados exclusivamente para a execuÃ§Ã£o do presente contrato e obrigaÃ§Ãµes legais decorrentes;
b) AdequaÃ§Ã£o: o tratamento serÃ¡ compatÃ­vel com as finalidades informadas;
c) Necessidade: somente serÃ£o coletados e tratados os dados estritamente necessÃ¡rios;
d) SeguranÃ§a: serÃ£o adotadas medidas tÃ©cnicas e administrativas para proteÃ§Ã£o dos dados contra acessos nÃ£o autorizados, destruiÃ§Ã£o, perda ou alteraÃ§Ã£o.

17.2. O LOCATÃRIO autoriza expressamente a ADMINISTRADORA a compartilhar seus dados com o LOCADOR, fiador(es), Ã³rgÃ£os de proteÃ§Ã£o ao crÃ©dito, cartÃ³rios de protesto e demais entidades necessÃ¡rias para a execuÃ§Ã£o e fiscalizaÃ§Ã£o do contrato.

CLÃUSULA DÃ‰CIMA OITAVA - DAS DISPOSIÃ‡Ã•ES GERAIS

18.1. O presente contrato Ã© celebrado em carÃ¡ter irrevogÃ¡vel e irretratÃ¡vel, obrigando as partes, seus herdeiros e sucessores.

18.2. A tolerÃ¢ncia quanto ao descumprimento de qualquer clÃ¡usula nÃ£o constituirÃ¡ novaÃ§Ã£o ou precedente, podendo o direito ser exercido a qualquer momento.

18.3. Caso qualquer disposiÃ§Ã£o deste contrato seja considerada invÃ¡lida ou inexequÃ­vel, as demais disposiÃ§Ãµes permanecerÃ£o em pleno vigor e efeito.

18.4. O presente contrato Ã© regido subsidiariamente pela Lei nÂº 8.245/91 (Lei do Inquilinato), pelo CÃ³digo Civil Brasileiro (Lei nÂº 10.406/02) e demais legislaÃ§Ãµes aplicÃ¡veis.

CLÃUSULA DÃ‰CIMA NONA - DO FORO

19.1. Fica eleito o foro da Comarca de {{PROPERTY_CITY}} para dirimir todas as controvÃ©rsias e questÃµes oriundas do presente contrato, com renÃºncia expressa e irrevogÃ¡vel a qualquer outro, por mais privilegiado que seja.`
    },
    sale_cash: {
        id: 'sale_cash',
        title: 'Compromisso de Compra e Venda',
        desc: 'Instrumento particular com intermediaÃ§Ã£o da ImobiliÃ¡ria.',
        content: `INSTRUMENTO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA DE IMÃ“VEL, COM INTERMEDIAÃ‡ÃƒO IMOBILIÃRIA

Pelo presente instrumento particular, as partes a seguir qualificadas:

CLÃUSULA PRIMEIRA - DAS PARTES E QUALIFICAÃ‡ÃƒO

1.1. VENDEDOR: {{OWNER_NAME}}, [nacionalidade], [estado civil], [profissÃ£o], portador(a) da CÃ©dula de Identidade RG nÂº [RG], inscrito(a) no CPF/CNPJ sob nÂº {{OWNER_DOC}}, residente e domiciliado(a) Ã  [endereÃ§o], legÃ­timo(a) proprietÃ¡rio(a) do imÃ³vel objeto deste instrumento, conforme matrÃ­cula nÂº [matrÃ­cula] do CartÃ³rio de Registro de ImÃ³veis da Comarca de {{PROPERTY_CITY}}, doravante denominado simplesmente VENDEDOR.

1.2. COMPRADOR: {{CLIENT_NAME}}, [nacionalidade], [estado civil], [profissÃ£o], portador(a) da CÃ©dula de Identidade RG nÂº [RG], inscrito(a) no CPF/CNPJ sob nÂº {{CLIENT_DOC}}, residente e domiciliado(a) Ã  {{CLIENT_ADDR}}, doravante denominado simplesmente COMPRADOR.

1.3. INTERMEDIADORA: {{AGENCY_NAME}}, pessoa jurÃ­dica de direito privado, inscrita no CNPJ/MF sob nÂº {{AGENCY_CNPJ}}, com sede Ã  {{AGENCY_ADDRESS}}, devidamente registrada no Conselho Regional de Corretores de ImÃ³veis - CRECI sob nÂº {{AGENCY_CRECI}}, neste ato representada por seu representante legal, doravante denominada simplesmente INTERMEDIADORA.

CLÃUSULA SEGUNDA - DAS DECLARAÃ‡Ã•ES DAS PARTES

2.1. O VENDEDOR declara, sob as penas do art. 299 do CÃ³digo Penal, que:
a) Ã‰ o legÃ­timo, Ãºnico e exclusivo proprietÃ¡rio do imÃ³vel objeto deste instrumento;
b) O imÃ³vel encontra-se livre e desembaraÃ§ado de quaisquer Ã´nus reais, hipotecas, alienaÃ§Ãµes fiduciÃ¡rias, penhoras, sequestros, arrestos, aÃ§Ãµes judiciais reais ou pessoais reipersecutÃ³rias, inventÃ¡rios, arrolamentos, usufruto, uso, habitaÃ§Ã£o, servidÃµes ou quaisquer outros gravames ou restriÃ§Ãµes de qualquer natureza;
c) O imÃ³vel estÃ¡ quite com todos os tributos municipais (IPTU, taxas), estaduais e federais, bem como com as contribuiÃ§Ãµes condominiais, se aplicÃ¡vel;
d) NÃ£o responde a qualquer aÃ§Ã£o judicial ou extrajudicial que possa, direta ou indiretamente, afetar a livre disponibilidade, posse ou propriedade do imÃ³vel;
e) Todas as informaÃ§Ãµes e documentos fornecidos sobre o imÃ³vel sÃ£o verdadeiros, completos e correspondem Ã  realidade;
f) O imÃ³vel nÃ£o possui dÃ©bitos de qualquer natureza perante companhias de Ã¡gua, luz, gÃ¡s ou outras concessionÃ¡rias de serviÃ§os pÃºblicos.

2.2. O COMPRADOR declara que:
a) Teve amplo acesso ao imÃ³vel, vistoriou-o pessoalmente e estÃ¡ ciente de seu estado de conservaÃ§Ã£o, condiÃ§Ãµes fÃ­sicas, dimensÃµes, localizaÃ§Ã£o, benfeitorias e caracterÃ­sticas gerais;
b) Teve acesso a toda a documentaÃ§Ã£o do imÃ³vel, incluindo certidÃµes, matrÃ­cula, plantas e comprovantes de quitaÃ§Ã£o;
c) Aceita o imÃ³vel no estado em que se encontra, isentando o VENDEDOR de quaisquer reparos ou benfeitorias futuras, ressalvados os vÃ­cios ocultos que comprometam a solidez, seguranÃ§a ou habitabilidade;
d) Possui capacidade financeira para cumprir integralmente as obrigaÃ§Ãµes assumidas neste instrumento.

CLÃUSULA TERCEIRA - DA INTERMEDIAÃ‡ÃƒO IMOBILIÃRIA

3.1. A INTERMEDIADORA declara estar devidamente habilitada e registrada no CRECI, tendo aproximado as partes, conduzido as negociaÃ§Ãµes, prestado assessoria imobiliÃ¡ria completa, auxiliado na anÃ¡lise documental e na formataÃ§Ã£o jurÃ­dica do negÃ³cio.

3.2. As partes reconhecem, de forma expressa e irrevogÃ¡vel, a participaÃ§Ã£o efetiva da INTERMEDIADORA na concretizaÃ§Ã£o deste negÃ³cio, declarando-se plenamente satisfeitas com os serviÃ§os prestados.

CLÃUSULA QUARTA - DO IMÃ“VEL

4.1. O imÃ³vel objeto do presente compromisso Ã© assim descrito: [descriÃ§Ã£o completa do imÃ³vel conforme matrÃ­cula], situado Ã  {{PROPERTY_ADDR}}, no MunicÃ­pio de [cidade], Estado de [estado], com Ã¡rea de [Ã¡rea]mÂ², contendo [cÃ´modos], registrado sob nÂº [matrÃ­cula], no CartÃ³rio de Registro de ImÃ³veis da Comarca de {{PROPERTY_CITY}}.

4.2. Integram o imÃ³vel, como partes acessÃ³rias e inseparÃ¡veis, todas as benfeitorias, utilidades, direitos e pertenÃ§as existentes, incluindo: [listar equipamentos, mÃ³veis planejados, ar condicionado, etc., se aplicÃ¡vel].

CLÃUSULA QUINTA - DO PREÃ‡O E CONDIÃ‡Ã•ES DE PAGAMENTO

5.1. O preÃ§o certo, ajustado e irretratÃ¡vel para a compra e venda Ã© de R$ {{VALUE}} ({{VALUE_EXTENSO}}), que serÃ¡ pago nas seguintes condiÃ§Ãµes e prazos:

5.1.1. SINAL: R$ [valor do sinal por extenso] ([valor numÃ©rico]), pago neste ato pelo COMPRADOR ao VENDEDOR, via [forma de pagamento], que dÃ¡ plena e integral quitaÃ§Ã£o, servindo o presente instrumento como o mais amplo e recibo.

5.1.2. PAGAMENTO COMPLEMENTAR: R$ [valor] ([valor por extenso]), a ser pago em [nÃºmero] parcelas mensais e consecutivas no valor de R$ [valor cada] ([por extenso]), vencendo-se a primeira em [data] e as demais em igual dia dos meses subsequentes.

5.1.3. SALDO REMANESCENTE: R$ [valor] ([valor por extenso]), a ser pago na data da assinatura da Escritura PÃºblica de Compra e Venda, mediante: (a) recursos prÃ³prios do COMPRADOR; (b) financiamento imobiliÃ¡rio a ser obtido pelo COMPRADOR junto a instituiÃ§Ã£o financeira de sua escolha; ou (c) combinaÃ§Ã£o de ambas as formas.

5.2. Todos os pagamentos serÃ£o efetuados mediante depÃ³sito em conta bancÃ¡ria de titularidade do VENDEDOR ou por meio de instrumentos de crÃ©dito que as partes vierem a acordar.

5.3. O atraso no pagamento de qualquer parcela implicarÃ¡ a incidÃªncia cumulativa de:
a) Multa moratÃ³ria de 10% (dez por cento) sobre o valor da parcela em atraso;
b) Juros moratÃ³rios de 1% (um por cento) ao mÃªs, calculados pro rata die;
c) CorreÃ§Ã£o monetÃ¡ria pelo IGP-M/FGV, calculada pro rata die, desde a data do vencimento atÃ© o efetivo pagamento.

5.4. O inadimplemento superior a 90 (noventa) dias consecutivos ou alternados autoriza o VENDEDOR a considerar rescindido o presente compromisso, perdendo o COMPRADOR em favor do VENDEDOR, a tÃ­tulo de clÃ¡usula penal compensatÃ³ria, 30% (trinta por cento) de todos os valores efetivamente pagos, devendo o saldo remanescente ser restituÃ­do ao COMPRADOR em atÃ© 60 (sessenta) dias, corrigido monetariamente, sem prejuÃ­zo da cobranÃ§a das parcelas vencidas e nÃ£o pagas.

CLÃUSULA SEXTA - DA DOCUMENTAÃ‡ÃƒO, ESCRITURA E REGISTRO

6.1. O VENDEDOR obriga-se a fornecer ao COMPRADOR, no prazo mÃ¡ximo de 15 (quinze) dias contados da solicitaÃ§Ã£o, toda a documentaÃ§Ã£o necessÃ¡ria para:
a) ObtenÃ§Ã£o de financiamento imobiliÃ¡rio, se houver;
b) Lavratura da Escritura PÃºblica de Compra e Venda;
c) Registro da Escritura no CartÃ³rio de Registro de ImÃ³veis competente.

6.2. A Escritura PÃºblica de Compra e Venda serÃ¡ lavrada no prazo de 60 (sessenta) dias contados da quitaÃ§Ã£o integral do preÃ§o ou da liberaÃ§Ã£o do financiamento, em CartÃ³rio de Notas de livre escolha do COMPRADOR.

6.3. CorrerÃ£o por conta exclusiva do COMPRADOR todas as despesas inerentes Ã  transferÃªncia da propriedade, incluindo, mas nÃ£o se limitando a:
a) Imposto de TransmissÃ£o de Bens ImÃ³veis - ITBI;
b) Emolumentos cartorÃ¡rios para lavratura da Escritura;
c) Emolumentos para registro da Escritura no CartÃ³rio de Registro de ImÃ³veis;
d) CertidÃµes imobiliÃ¡rias, pessoais, fiscais e trabalhistas;
e) Taxas e emolumentos de averbaÃ§Ãµes necessÃ¡rias;
f) HonorÃ¡rios advocatÃ­cios para anÃ¡lise documental, se contratados.

6.4. O VENDEDOR arcarÃ¡ com o Imposto de Renda sobre o ganho de capital eventualmente devido, bem como com a quitaÃ§Ã£o de eventuais dÃ©bitos tributÃ¡rios ou condominiais existentes atÃ© a data da transferÃªncia da propriedade.

CLÃUSULA SÃ‰TIMA - DA POSSE E IMISSÃƒO

7.1. A posse direta e efetiva do imÃ³vel serÃ¡ transmitida ao COMPRADOR na data da assinatura da Escritura PÃºblica de Compra e Venda ou na data da quitaÃ§Ã£o integral do preÃ§o, o que ocorrer primeiro, mediante a entrega das chaves e do Termo de ImissÃ£o na Posse.

7.2. AtÃ© a data da imissÃ£o na posse, o VENDEDOR responderÃ¡ integralmente pela guarda, conservaÃ§Ã£o e seguranÃ§a do imÃ³vel, bem como por todos os tributos, taxas, contribuiÃ§Ãµes e despesas condominiais que incidirem sobre o imÃ³vel.

7.3. Os riscos de perda ou deterioraÃ§Ã£o do imÃ³vel, inclusive por caso fortuito ou forÃ§a maior, serÃ£o transferidos ao COMPRADOR a partir da data da imissÃ£o na posse.

CLÃUSULA OITAVA - DAS GARANTIAS E RESPONSABILIDADES

8.1. O VENDEDOR garante a evicÃ§Ã£o nos termos dos arts. 447 a 457 do CÃ³digo Civil, responsabilizando-se integralmente pela perda total ou parcial do imÃ³vel em decorrÃªncia de direito anterior de terceiro.

8.2. O VENDEDOR garante a existÃªncia e a validade do imÃ³vel, responsabilizando-se pelos vÃ­cios redibitÃ³rios ocultos que comprometam a solidez, seguranÃ§a ou habitabilidade, nos termos dos arts. 441 a 446 do CÃ³digo Civil.

8.3. O COMPRADOR deverÃ¡ comunicar ao VENDEDOR, por escrito, a constataÃ§Ã£o de vÃ­cios redibitÃ³rios no prazo de 30 (trinta) dias contados da descoberta, sob pena de decadÃªncia.

CLÃUSULA NONA - DO FINANCIAMENTO IMOBILIÃRIO

9.1. Em caso de pagamento do saldo mediante financiamento imobiliÃ¡rio, o COMPRADOR obriga-se a:
a) Iniciar o processo de financiamento em atÃ© 15 (quinze) dias da assinatura deste instrumento;
b) Fornecer toda a documentaÃ§Ã£o solicitada pela instituiÃ§Ã£o financeira nos prazos estipulados;
c) Informar ao VENDEDOR e Ã  INTERMEDIADORA, imediatamente, qualquer intercorrÃªncia no processo.

9.2. Caso o financiamento nÃ£o seja aprovado por culpa exclusiva do COMPRADOR (falta de documentaÃ§Ã£o, restriÃ§Ãµes cadastrais prÃ©-existentes nÃ£o informadas, etc.), o VENDEDOR poderÃ¡ optar pela rescisÃ£o do contrato, com a retenÃ§Ã£o de 20% (vinte por cento) dos valores pagos a tÃ­tulo de clÃ¡usula penal.

9.3. Caso o financiamento nÃ£o seja aprovado por decisÃ£o da instituiÃ§Ã£o financeira sem culpa das partes, o presente compromisso serÃ¡ rescindido de pleno direito, restituindo-se ao COMPRADOR todos os valores pagos, no prazo de 30 (trinta) dias, sem retenÃ§Ã£o ou multa.

CLÃUSULA DÃ‰CIMA - DA COMISSÃƒO DE CORRETAGEM

10.1. O VENDEDOR reconhece ser devida Ã  INTERMEDIADORA a comissÃ£o de corretagem no valor correspondente a [percentual]% sobre o preÃ§o total da venda, no montante de R$ [valor] ([valor por extenso]).

10.2. A comissÃ£o serÃ¡ paga no ato da assinatura do presente instrumento ou na data do recebimento do sinal, deduzida do montante recebido, caso a INTERMEDIADORA esteja recebendo os valores em nome do VENDEDOR.

10.3. Em caso de desistÃªncia imotivada de qualquer das partes, ou de rescisÃ£o contratual por culpa exclusiva de qualquer das partes, a parte desistente ou culpada arcarÃ¡ integralmente com a comissÃ£o devida Ã  INTERMEDIADORA, alÃ©m das demais sanÃ§Ãµes contratuais.

CLÃUSULA DÃ‰CIMA PRIMEIRA - DA IRREVOGABILIDADE E IRRATRATABILIDADE

11.1. O presente instrumento Ã© celebrado em carÃ¡ter irrevogÃ¡vel e irretratÃ¡vel, obrigando as partes contratantes, seus herdeiros, legatÃ¡rios e sucessores a todos os seus efeitos legais, nos termos do art. 1.417 do CÃ³digo Civil.

11.2. O arrependimento imotivado de qualquer das partes, apÃ³s a assinatura deste instrumento, implicarÃ¡ o pagamento de multa compensatÃ³ria de 20% (vinte por cento) sobre o valor total do negÃ³cio, em favor da parte nÃ£o arrependida, sem prejuÃ­zo das demais penalidades.

11.3. O presente compromisso confere ao COMPRADOR direito real Ã  aquisiÃ§Ã£o do imÃ³vel, oponÃ­vel a terceiros, nos termos do art. 1.417 do CÃ³digo Civil, podendo ser registrado na matrÃ­cula do imÃ³vel.

CLÃUSULA DÃ‰CIMA SEGUNDA - DA RESCISÃƒO CONTRATUAL

12.1. Constituem hipÃ³teses de rescisÃ£o contratual:
a) Inadimplemento de qualquer obrigaÃ§Ã£o pecuniÃ¡ria por prazo superior a 90 (noventa) dias;
b) Descumprimento de qualquer declaraÃ§Ã£o, garantia ou obrigaÃ§Ã£o nÃ£o pecuniÃ¡ria;
c) DesistÃªncia imotivada de qualquer das partes;
d) NÃ£o aprovaÃ§Ã£o de financiamento por culpa do COMPRADOR;
e) Fraude, dolo ou simulaÃ§Ã£o na celebraÃ§Ã£o do contrato.

12.2. A rescisÃ£o serÃ¡ comunicada por escrito Ã  parte inadimplente, concedendo-se prazo de 15 (quinze) dias para regularizaÃ§Ã£o, salvo nas hipÃ³teses em que o prazo jÃ¡ tenha expirado.

CLÃUSULA DÃ‰CIMA TERCEIRA - DAS DISPOSIÃ‡Ã•ES TRIBUTÃRIAS

13.1. O COMPRADOR Ã© responsÃ¡vel pelo recolhimento do ITBI, nos termos da legislaÃ§Ã£o municipal aplicÃ¡vel.

13.2. O VENDEDOR Ã© responsÃ¡vel pelo recolhimento do Imposto de Renda sobre o ganho de capital, se devido, nos termos da legislaÃ§Ã£o federal.

13.3. As partes se comprometem a declarar o presente negÃ³cio em suas respectivas declaraÃ§Ãµes de Imposto de Renda, na forma da legislaÃ§Ã£o fiscal vigente.

CLÃUSULA DÃ‰CIMA QUARTA - DA PROTEÃ‡ÃƒO DE DADOS PESSOAIS (LGPD)

14.1. As partes se comprometem a tratar os dados pessoais compartilhados em estrita conformidade com a Lei nÂº 13.709/2018 (LGPD), adotando as medidas tÃ©cnicas e administrativas necessÃ¡rias para proteger os dados contra acessos nÃ£o autorizados, destruiÃ§Ã£o, perda, alteraÃ§Ã£o, comunicaÃ§Ã£o ou qualquer forma de tratamento inadequado.

14.2. A INTERMEDIADORA fica autorizada a compartilhar os dados das partes com instituiÃ§Ãµes financeiras, cartÃ³rios, Ã³rgÃ£os pÃºblicos e demais entidades necessÃ¡rias para a execuÃ§Ã£o do presente contrato.

CLÃUSULA DÃ‰CIMA QUINTA - DAS NOTIFICAÃ‡Ã•ES E COMUNICAÃ‡Ã•ES

15.1. Todas as notificaÃ§Ãµes, comunicaÃ§Ãµes e intimaÃ§Ãµes entre as partes serÃ£o consideradas vÃ¡lidas quando realizadas por escrito, atravÃ©s de e-mail, WhatsApp, plataforma digital do sistema ou correspondÃªncia fÃ­sica, para os endereÃ§os e contatos informados neste instrumento ou posteriormente atualizados.

CLÃUSULA DÃ‰CIMA SEXTA - DAS DISPOSIÃ‡Ã•ES GERAIS

16.1. O presente contrato Ã© regido pelo CÃ³digo Civil Brasileiro (Lei nÂº 10.406/02) e demais legislaÃ§Ãµes aplicÃ¡veis.

16.2. A nulidade de qualquer clÃ¡usula nÃ£o afetarÃ¡ a validade das demais disposiÃ§Ãµes, que permanecerÃ£o em pleno vigor.

16.3. A tolerÃ¢ncia quanto ao descumprimento de qualquer obrigaÃ§Ã£o nÃ£o constituirÃ¡ novaÃ§Ã£o contratual, podendo o direito ser exercido a qualquer momento.

CLÃUSULA DÃ‰CIMA SÃ‰TIMA - DO FORO

17.1. Para dirimir todas as controvÃ©rsias oriundas do presente contrato, as partes elegem o foro da Comarca de {{PROPERTY_CITY}}, com renÃºncia expressa e irrevogÃ¡vel a qualquer outro, por mais privilegiado ou especial que seja.`
    },
    admin_service: {
        id: 'admin_service',
        title: 'Contrato de AdministraÃ§Ã£o (ProprietÃ¡rio)',
        desc: 'Contrato entre ProprietÃ¡rio e ImobiliÃ¡ria.',
        content: `CONTRATO DE ADMINISTRAÃ‡ÃƒO IMOBILIÃRIA - GESTÃƒO INTEGRAL DE IMÃ“VEL

Pelo presente instrumento particular, as partes a seguir qualificadas:

CLÃUSULA PRIMEIRA - DAS PARTES E QUALIFICAÃ‡ÃƒO

1.1. CONTRATANTE (PROPRIETÃRIO): {{OWNER_NAME}}, [nacionalidade], [estado civil], [profissÃ£o], portador(a) do CPF/CNPJ sob nÂº {{OWNER_DOC}}, residente e domiciliado(a) Ã  [endereÃ§o], legÃ­timo(a) proprietÃ¡rio(a) do imÃ³vel objeto deste contrato, doravante denominado simplesmente CONTRATANTE.

1.2. CONTRATADA (ADMINISTRADORA): {{AGENCY_NAME}}, pessoa jurÃ­dica de direito privado, inscrita no CNPJ/MF sob nÂº {{AGENCY_CNPJ}}, com sede Ã  {{AGENCY_ADDRESS}}, devidamente registrada no Conselho Regional de Corretores de ImÃ³veis - CRECI sob nÂº {{AGENCY_CRECI}}, neste ato representada por seu representante legal, devidamente habilitada e em pleno gozo de seus direitos para o exercÃ­cio da administraÃ§Ã£o imobiliÃ¡ria, doravante denominada simplesmente CONTRATADA.

CLÃUSULA SEGUNDA - DO OBJETO E ESCOPO DA ADMINISTRAÃ‡ÃƒO

2.1. O CONTRATANTE entrega Ã  CONTRATADA, para fins de administraÃ§Ã£o imobiliÃ¡ria integral e exclusiva, o imÃ³vel de sua propriedade situado Ã  {{PROPERTY_ADDR}}, conforme descrito na matrÃ­cula nÂº [matrÃ­cula] do CartÃ³rio de Registro de ImÃ³veis da Comarca de {{PROPERTY_CITY}}, doravante denominado simplesmente IMÃ“VEL.

2.2. A administraÃ§Ã£o integral compreende todas as atividades necessÃ¡rias Ã  gestÃ£o completa do IMÃ“VEL, incluindo, mas nÃ£o se limitando a locaÃ§Ã£o, comercializaÃ§Ã£o, cobranÃ§a, manutenÃ§Ã£o, conservaÃ§Ã£o, gestÃ£o documental e financeira, repasses e prestaÃ§Ã£o de contas.

CLÃUSULA TERCEIRA - DAS OBRIGAÃ‡Ã•ES E SERVIÃ‡OS DA CONTRATADA

3.1. A CONTRATADA obriga-se a prestar, com diligÃªncia e profissionalismo, os seguintes serviÃ§os:

3.1.1. MARKETING E DIVULGAÃ‡ÃƒO:
a) PublicaÃ§Ã£o e veiculaÃ§Ã£o do IMÃ“VEL em seu site institucional e plataformas digitais prÃ³prias;
b) AnÃºncio nos principais portais imobiliÃ¡rios do mercado;
c) DivulgaÃ§Ã£o em redes sociais (Instagram, Facebook, YouTube) com conteÃºdo profissional, incluindo fotos, vÃ­deos e tours virtuais;
d) InserÃ§Ã£o no mailing ativo de clientes e prospects da CONTRATADA;
e) UtilizaÃ§Ã£o de ferramentas de marketing digital, incluindo anÃºncios patrocinados, quando aplicÃ¡vel;
f) ElaboraÃ§Ã£o de material publicitÃ¡rio profissional (folders, ficha tÃ©cnica, vÃ­deos).

3.1.2. SELEÃ‡ÃƒO DE PRETENDENTES:
a) Triagem e qualificaÃ§Ã£o de candidatos Ã  locaÃ§Ã£o ou compra;
b) AnÃ¡lise de documentaÃ§Ã£o pessoal e profissional;
c) VerificaÃ§Ã£o de idoneidade creditÃ­cia nos Ã³rgÃ£os de proteÃ§Ã£o ao crÃ©dito;
d) AnÃ¡lise de capacidade de pagamento;
e) ExigÃªncia e anÃ¡lise de garantias locatÃ­cias compatÃ­veis.

3.1.3. DOCUMENTAÃ‡ÃƒO E CONTRATUAL:
a) ElaboraÃ§Ã£o de contratos de locaÃ§Ã£o, compromissos de compra e venda e aditivos;
b) ElaboraÃ§Ã£o de Laudos de Vistoria circunstanciados com registro fotogrÃ¡fico;
c) GestÃ£o de registros e arquivos de toda a documentaÃ§Ã£o contratual;
d) EmissÃ£o de boletos bancÃ¡rios para pagamento de aluguÃ©is e encargos.

3.1.4. GESTÃƒO FINANCEIRA E COBRANÃ‡A:
a) CobranÃ§a administrativa de aluguÃ©is e encargos, incluindo envio de notificaÃ§Ãµes;
b) CobranÃ§a extrajudicial via protesto de tÃ­tulos e inclusÃ£o em Ã³rgÃ£os de proteÃ§Ã£o ao crÃ©dito;
c) CobranÃ§a judicial, mediante contrataÃ§Ã£o de advogado, quando necessÃ¡rio, com custas apropriadas ao CONTRATANTE previamente aprovadas;
d) Recebimento e administraÃ§Ã£o dos valores locatÃ­cios;
e) EfetivaÃ§Ã£o dos repasses mensais ao CONTRATANTE.

3.1.5. MANUTENÃ‡ÃƒO E CONSERVAÃ‡ÃƒO:
a) Atendimento e triagem de solicitaÃ§Ãµes de manutenÃ§Ã£o dos locatÃ¡rios;
b) OrÃ§amento e cotaÃ§Ã£o de reparos com fornecedores cadastrados e qualificados;
c) SupervisÃ£o e acompanhamento de serviÃ§os de manutenÃ§Ã£o e reparos;
d) GestÃ£o de manutenÃ§Ãµes preventivas periÃ³dicas.

3.1.6. PRESTAÃ‡ÃƒO DE CONTAS E RELATÃ“RIOS:
a) DisponibilizaÃ§Ã£o mensal de extrato discriminado de receitas e despesas;
b) RelatÃ³rio anual de desempenho do IMÃ“VEL;
c) DisponibilizaÃ§Ã£o de acesso online ao sistema de gestÃ£o para acompanhamento em tempo real.

3.2. A CONTRATADA nÃ£o se responsabiliza por:
a) InadimplÃªncia de locatÃ¡rios alÃ©m das obrigaÃ§Ãµes de cobranÃ§a estabelecidas nesta clÃ¡usula;
b) AÃ§Ãµes judiciais de terceiros que nÃ£o decorram de sua atuaÃ§Ã£o direta;
c) Danos causados por locatÃ¡rios ou terceiros ao IMÃ“VEL;
d) ValorizaÃ§Ãµes ou desvalorizaÃ§Ãµes mercadolÃ³gicas do IMÃ“VEL.

CLÃUSULA QUARTA - DA REMUNERAÃ‡ÃƒO, TAXAS E COMISSÃ•ES

4.1. Pelos serviÃ§os de administraÃ§Ã£o imobiliÃ¡ria prestados, a CONTRATADA farÃ¡ jus Ã s seguintes remuneraÃ§Ãµes, que serÃ£o descontadas diretamente dos valores recebidos, antes do repasse ao CONTRATANTE:

4.1.1. TAXA DE INTERMEDIAÃ‡ÃƒO DE LOCAÃ‡ÃƒO: equivalente ao valor de 01 (um) aluguel integral, devida no ato da assinatura de cada contrato de locaÃ§Ã£o, paga pelo CONTRATANTE.

4.1.2. TAXA DE ADMINISTRAÃ‡ÃƒO MENSAL: {{COMMISSION_RATE}}% ( [por extenso] por cento) sobre o valor bruto dos aluguÃ©is e encargos efetivamente recebidos no mÃªs, incidente sobre cada contrato de locaÃ§Ã£o em vigor.

4.1.3. TAXA DE RENOVAÃ‡ÃƒO: 50% (cinquenta por cento) do valor de 01 (um) aluguel vigente, devida a cada renovaÃ§Ã£o contratual, seja ela expressa ou tÃ¡cita.

4.1.4. TAXA DE ADMINISTRAÃ‡ÃƒO DE VAGA: nos casos de imÃ³veis com vagas de garagem locadas separadamente, serÃ¡ devida a taxa de administraÃ§Ã£o de 10% (dez por cento) sobre o valor da locaÃ§Ã£o da vaga.

4.2. As taxas e comissÃµes previstas nesta clÃ¡usula serÃ£o reajustadas anualmente pelo IGP-M/FGV.

4.3. Em caso de rescisÃ£o antecipada deste contrato de administraÃ§Ã£o antes do tÃ©rmino de 12 (doze) meses, serÃ¡ devida Ã  CONTRATADA multa equivalente a 06 (seis) meses da taxa de administraÃ§Ã£o mensal mÃ©dia, como compensaÃ§Ã£o pelos serviÃ§os de implantaÃ§Ã£o e estruturaÃ§Ã£o.

CLÃUSULA QUINTA - DA VIGÃŠNCIA, RENOVAÃ‡ÃƒO E DENÃšNCIA

5.1. O presente contrato vigorarÃ¡ pelo prazo inicial de 12 (doze) meses, iniciando-se em {{START_DATE}}.

5.2. Ao final do prazo inicial, renovar-se-Ã¡ automaticamente por iguais e sucessivos perÃ­odos de 12 (doze) meses, salvo manifestaÃ§Ã£o em contrÃ¡rio por escrito de qualquer das partes, com antecedÃªncia mÃ­nima de 60 (sessenta) dias do tÃ©rmino do perÃ­odo em curso.

5.3. Durante a vigÃªncia do contrato, o CONTRATANTE nÃ£o poderÃ¡ rescindi-lo sem justa causa, salvo mediante pagamento da multa compensatÃ³ria prevista na ClÃ¡usula Quarta, item 4.3.

5.4. Em caso de venda do IMÃ“VEL, o presente contrato serÃ¡ automaticamente transferido ao novo proprietÃ¡rio, que deverÃ¡ manifestar por escrito sua opÃ§Ã£o pela continuidade ou rescisÃ£o no prazo de 30 (trinta) dias.

CLÃUSULA SEXTA - DA EXCLUSIVIDADE

6.1. O CONTRATANTE concede Ã  CONTRATADA exclusividade plena, total e irrestrita na administraÃ§Ã£o, promoÃ§Ã£o, divulgaÃ§Ã£o, locaÃ§Ã£o e comercializaÃ§Ã£o do IMÃ“VEL durante toda a vigÃªncia deste contrato.

6.2. Durante a vigÃªncia da exclusividade, o CONTRATANTE nÃ£o poderÃ¡, direta ou indiretamente:
a) Contratar outros corretores, imobiliÃ¡rias ou administradoras;
b) Negociar, locar, vender ou prometer vender o IMÃ“VEL sem intermediaÃ§Ã£o da CONTRATADA;
c) Anunciar, divulgar ou promover o IMÃ“VEL por conta prÃ³pria ou por terceiros;
d) Permitir visitaÃ§Ãµes ou vistorias ao IMÃ“VEL sem acompanhamento da CONTRATADA.

6.3. A infraÃ§Ã£o ao disposto nesta clÃ¡usula sujeitarÃ¡ o CONTRATANTE ao pagamento integral das taxas de administraÃ§Ã£o e comissÃµes que seriam devidas Ã  CONTRATADA sobre o negÃ³cio realizado, independentemente de notificaÃ§Ã£o ou interpelaÃ§Ã£o.

CLÃUSULA SÃ‰TIMA - DAS OBRIGAÃ‡Ã•ES DO CONTRATANTE

7.1. Sem prejuÃ­zo das demais obrigaÃ§Ãµes previstas neste contrato, constituem obrigaÃ§Ãµes do CONTRATANTE:
a) Manter o IMÃ“VEL em perfeitas condiÃ§Ãµes de habitabilidade, seguranÃ§a e conservaÃ§Ã£o;
b) Realizar os reparos estruturais necessÃ¡rios, conforme solicitaÃ§Ã£o fundamentada da CONTRATADA;
c) Manter o IMÃ“VEL devidamente segurado contra incÃªndio, danos elÃ©tricos e responsabilidade civil;
d) Fornecer Ã  CONTRATADA toda a documentaÃ§Ã£o do IMÃ“VEL atualizada sempre que solicitado;
e) Comunicar imediatamente Ã  CONTRATADA qualquer alteraÃ§Ã£o em seus dados cadastrais, bancÃ¡rios ou de contato;
f) NÃ£o praticar atos que possam prejudicar a administraÃ§Ã£o ou a imagem do IMÃ“VEL;
g) Autorizar a realizaÃ§Ã£o de reparos e manutenÃ§Ãµes necessÃ¡rias, mediante apresentaÃ§Ã£o de orÃ§amento prÃ©vio para serviÃ§os acima de R$ 500,00;
h) Comparecer Ã  CONTRATADA para assinatura de contratos e documentos quando necessÃ¡rio.

CLÃUSULA OITAVA - DOS REPASSES FINANCEIROS

8.1. Os repasses mensais ao CONTRATANTE serÃ£o realizados atÃ© o dia 15 (quinze) do mÃªs subsequente ao recebimento, mediante depÃ³sito em conta bancÃ¡ria por ele indicada.

8.2. O repasse serÃ¡ feito lÃ­quido de:
a) Taxa de administraÃ§Ã£o mensal contratada;
b) Despesas de manutenÃ§Ã£o e reparos realizados no perÃ­odo;
c) Taxas e emolumentos administrativos;
d) Tributos incidentes sobre a operaÃ§Ã£o, se houver.

8.3. A prestaÃ§Ã£o de contas mensal serÃ¡ disponibilizada atÃ© o dia 10 (dez) do mÃªs subsequente, por meio do sistema online, contendo:
a) RelaÃ§Ã£o detalhada dos aluguÃ©is e encargos recebidos;
b) RelaÃ§Ã£o das despesas efetuadas, com comprovantes digitalizados;
c) CÃ¡lculo da taxa de administraÃ§Ã£o;
d) Demonstrativo do valor lÃ­quido a ser repassado;
e) Comprovante de depÃ³sito ou transferÃªncia bancÃ¡ria.

CLÃUSULA NONA - DA RESCISÃƒO E PENALIDADES

9.1. A CONTRATADA poderÃ¡ rescindir o presente contrato imediatamente, independentemente de notificaÃ§Ã£o, nas seguintes hipÃ³teses:
a) Descumprimento reiterado de obrigaÃ§Ãµes contratuais pelo CONTRATANTE;
b) Venda do IMÃ“VEL sem comunicaÃ§Ã£o prÃ©via;
c) Conduta do CONTRATANTE que prejudique a administraÃ§Ã£o;
d) Inviabilidade tÃ©cnica, jurÃ­dica ou comercial da continuidade da administraÃ§Ã£o.

9.2. O CONTRATANTE poderÃ¡ rescindir o contrato a qualquer tempo, mediante pagamento da multa prevista na ClÃ¡usula Quarta, ou por justa causa, nas seguintes hipÃ³teses:
a) Conduta desidiosa ou negligente comprovada da CONTRATADA;
b) ApropriaÃ§Ã£o indÃ©bita de valores;
c) Descumprimento reiterado das obrigaÃ§Ãµes contratuais pela CONTRATADA.

9.3. Rescindido o contrato, a CONTRATADA obriga-se a:
a) Entregar ao CONTRATANTE toda a documentaÃ§Ã£o relativa ao IMÃ“VEL no prazo de 15 (quinze) dias;
b) Repassar todos os valores eventualmente retidos, lÃ­quidos das taxas devidas;
c) Transferir a administraÃ§Ã£o ao CONTRATANTE ou a nova administradora indicada.

CLÃUSULA DÃ‰CIMA - DAS VISTORIAS E INSPEÃ‡Ã•ES

10.1. A CONTRATADA realizarÃ¡ vistorias anuais no IMÃ“VEL, mediante prÃ©vio agendamento com os locatÃ¡rios, para verificaÃ§Ã£o do estado de conservaÃ§Ã£o.

10.2. PoderÃ£o ser realizadas vistorias extraordinÃ¡rias, a qualquer tempo, em caso de denÃºncia de problemas ou suspeita de irregularidades.

10.3. Os laudos de vistoria serÃ£o disponibilizados ao CONTRATANTE em atÃ© 15 (quinze) dias da realizaÃ§Ã£o, com registro fotogrÃ¡fico.

CLÃUSULA DÃ‰CIMA PRIMEIRA - DA RESPONSABILIDADE CIVIL E INDENIZAÃ‡Ã•ES

11.1. A CONTRATADA responderÃ¡ civilmente por danos causados ao CONTRATANTE decorrentes de dolo ou culpa devidamente comprovados no exercÃ­cio de suas atividades.

11.2. A responsabilidade da CONTRATADA fica limitada ao valor de 12 (doze) meses da taxa de administraÃ§Ã£o recebida, salvo em caso de dolo ou conduta criminosa.

11.3. O CONTRATANTE responsabiliza-se por danos causados a terceiros ou ao IMÃ“VEL decorrentes de sua conduta ou de vÃ­cios estruturais de sua responsabilidade.

CLÃUSULA DÃ‰CIMA SEGUNDA - DAS DISPOSIÃ‡Ã•ES GERAIS

12.1. O presente contrato Ã© regido pelo CÃ³digo Civil Brasileiro (Lei nÂº 10.406/02) e pela ResoluÃ§Ã£o COFECI nÂº 326/92 e legislaÃ§Ãµes correlatas.

12.2. A nulidade de qualquer clÃ¡usula nÃ£o afetarÃ¡ a validade das demais disposiÃ§Ãµes, que permanecerÃ£o em pleno vigor.

12.3. A tolerÃ¢ncia quanto ao descumprimento de qualquer obrigaÃ§Ã£o nÃ£o constituirÃ¡ novaÃ§Ã£o contratual.

12.4. As partes elegem como vÃ¡lidas as comunicaÃ§Ãµes enviadas por e-mail, WhatsApp, plataforma digital do sistema ou correspondÃªncia fÃ­sica para os endereÃ§os cadastrados.

CLÃUSULA DÃ‰CIMA TERCEIRA - DA PROTEÃ‡ÃƒO DE DADOS PESSOAIS (LGPD)

13.1. As partes comprometem-se a tratar os dados pessoais compartilhados em conformidade com a Lei nÂº 13.709/2018, adotando medidas de seguranÃ§a tÃ©cnicas e administrativas para proteÃ§Ã£o dos dados.

CLÃUSULA DÃ‰CIMA QUARTA - DO FORO

14.1. Fica eleito o foro da Comarca de {{PROPERTY_CITY}} para dirimir todas as controvÃ©rsias oriundas do presente contrato, com renÃºncia expressa a qualquer outro, por mais privilegiado que seja.`
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

    const dynamicTemplates = useMemo(() => {
        return OFFICIAL_CONTRACT_TEMPLATES;
    }, []);

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

            const templateNeedsOwner = !!dynamicTemplates[selectedTemplate]?.requiresOwner;
            if (!prop || !cli || (templateNeedsOwner && !own)) {
                alert("Dados invÃ¡lidos. Verifique as seleÃ§Ãµes.");
                return;
            }

            // Mock contract for generation
            const mockContract: Partial<Contract> = {
                propertyId: prop.id,
                propertyTitle: prop.title,
                type: templateToContractType(selectedTemplate),
                clientId: cli.id,
                clientName: cli.name,
                ownerId: own?.id || '',
                ownerName: own?.name || '',
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

        const templateNeedsOwner = !!dynamicTemplates[selectedTemplate]?.requiresOwner;
        if (!prop || !cli || (templateNeedsOwner && !own)) return;

        const contractData: Partial<Contract> = {
            propertyId: prop.id,
            propertyTitle: prop.title,
            propertyImage: prop.image,
            type: templateToContractType(selectedTemplate),
            clientId: cli.id,
            clientName: cli.name,
            clientPhone: cli.phone || '',
            ownerId: own?.id || '',
            ownerName: own?.name || '',
            ownerPhone: own?.phone || '',
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
        if (confirm("Tem certeza que deseja excluir este contrato? Esta aÃ§Ã£o Ã© irreversÃ­vel.")) {
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
        if (!template) return "Template nÃ£o encontrado.";

        const owner = users.find(u => u.id === contract.ownerId);
        const client = users.find(u => u.id === contract.clientId);
        const property = properties.find(p => p.id === contract.propertyId);

        let text = Object.entries(buildContractPlaceholders({ contract, agency: AGENCY, client, owner, property }))
            .reduce((content, [key, value]) => content.split(key).join(value || ''), template.content);

        const replacements: Record<string, string> = {
            '{{AGENCY_NAME}}': AGENCY.name,
            '{{AGENCY_CNPJ}}': AGENCY.cnpj,
            '{{AGENCY_CRECI}}': AGENCY.creci,
            '{{AGENCY_ADDRESS}}': AGENCY.address,

            '{{OWNER_NAME}}': (contract.ownerName || '').toUpperCase(),
            '{{OWNER_DOC}}': owner?.document || '000.000.000-00',

            '{{CLIENT_NAME}}': (contract.clientName || '').toUpperCase(),
            '{{CLIENT_DOC}}': client?.document || '000.000.000-00',
            '{{CLIENT_ADDR}}': client?.address || 'EndereÃ§o nÃ£o informado',

            '{{PROPERTY_ADDR}}': property ? `${property.location} - ${property.title}` : 'EndereÃ§o do ImÃ³vel',
            '{{PROPERTY_CITY}}': property?.location.split(',')[1]?.trim() || 'SÃ£o Paulo',

            '{{VALUE}}': Number(contract.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            '{{VALUE_EXTENSO}}': 'valor pactuado', 

            '{{START_DATE}}': contract.startDate ? new Date(contract.startDate).toLocaleDateString('pt-BR') : '',
            '{{END_DATE}}': contract.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR') : 'Indeterminado',
            '{{DUE_DAY}}': String(contract.dueDay || ''),
            '{{COMMISSION_RATE}}': String(contract.commissionRate || ''),
            '{{DAYS_COUNT}}': contract.endDate && contract.startDate ? Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24)).toString() : '0'
        };

        Object.keys(replacements).forEach(key => {
            text = text.replace(new RegExp(key, 'g'), replacements[key]);
        });

        // Anexa clÃ¡usulas legais adicionais das configuraÃ§Ãµes
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

        if (!property || !tenant) {
            alert('Dados incompletos para gerar o PDF.');
            return;
        }

        const ownerData = owner || ({ id: contract.ownerId || '', name: contract.ownerName || '', phone: contract.ownerPhone || '', email: '', role: 'owner', avatar: '', favorites: [] } as User);
        const doc = await generateContractPDF(contract, property, tenant, ownerData, contract.customContent || generateDocumentBody(contract), AGENCY.logo, AGENCY.name, AGENCY.cnpj, AGENCY.creci, AGENCY.address, AGENCY.stampUrl, AGENCY.stampName);
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
            alert("Erro ao salvar contrato. Verifique sua conexÃ£o e tente novamente.");
        } finally {
            setIsSavingContract(false);
        }
    };

    const handlePrint = async () => {
        if (!viewingContract) return;
        const property = properties.find(p => p.id === viewingContract.propertyId);
        const tenant = users.find(u => u.id === viewingContract.clientId);
        const owner = users.find(u => u.id === viewingContract.ownerId);
        if (!property || !tenant) {
            alert('Dados incompletos para gerar o PDF.');
            return;
        }
        try {
            const ownerData = owner || ({ id: viewingContract.ownerId || '', name: viewingContract.ownerName || '', phone: viewingContract.ownerPhone || '', email: '', role: 'owner', avatar: '', favorites: [] } as User);
            const doc = await generateContractPDF(viewingContract, property, tenant, ownerData, currentText, AGENCY.logo, AGENCY.name, AGENCY.cnpj, AGENCY.creci, AGENCY.address, AGENCY.stampUrl, AGENCY.stampName);
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
            alert("ConteÃºdo do contrato salvo com sucesso!");
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
            alert("Erro ao salvar assinatura no banco de dados. Verifique sua conexÃ£o e tente novamente.");
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
            console.error("Erro ao salvar assinatura da imobiliÃ¡ria:", e);
            alert("Erro ao salvar assinatura no banco de dados. Verifique sua conexÃ£o e tente novamente.");
        }
    };

    const handleSendForSignature = async () => {
        if (!viewingContract) return;
        setIsSendingEmail(true);
        try {
            const recipientClient = users.find(u => u.id === viewingContract.clientId);
            const recipientEmail = recipientClient?.email;
            if (!recipientEmail) {
                alert('Cliente nao possui email cadastrado.');
                return;
            }

            const currentTenantSlug = localStorage.getItem('estateflow_last_slug') || window.location.pathname.split('/').filter(Boolean)[0] || '';
            const currentCompanyId = localStorage.getItem('estateflow_company_id') || '';
            if (!currentTenantSlug || !currentCompanyId) {
                alert('Nao foi possivel identificar a imobiliaria atual. Recarregue a tela pelo endereco da imobiliaria e tente novamente.');
                return;
            }

            const sendResponse = await fetch('/api/contracts/send-signature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('ef_token') ? { Authorization: `Bearer ${localStorage.getItem('ef_token')}` } : {}),
                },
                body: JSON.stringify({
                    company_id: currentCompanyId,
                    tenant_slug: currentTenantSlug,
                    contract_id: viewingContract.id,
                    to_email: recipientEmail,
                    base_url: settings?.appUrl || import.meta.env.VITE_APP_URL || window.location.origin,
                    contract_content: currentText || generatedBody || viewingContract.customContent || generateDocumentBody(viewingContract),
                }),
            });
            const sendData = await sendResponse.json().catch(() => null);
            if (!sendResponse.ok || !sendData?.success) {
                alert(sendData?.error || 'Erro ao enviar contrato. Verifique o SMTP da imobiliaria.');
                return;
            }

            const updated = {
                ...viewingContract,
                signatureStatus: 'pending' as const,
                signatureImage: undefined,
                signedAt: undefined,
                sentAt: new Date().toISOString(),
                customContent: currentText || generatedBody || viewingContract.customContent,
            };
            setViewingContract(updated);
            alert(`Link de assinatura enviado para ${recipientEmail}.`);
            if (sendData.data?.url) {
                window.open(sendData.data.url, '_blank', 'noopener,noreferrer');
            }
            return;

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
                alert('Cliente nÃ£o possui email cadastrado.');
                setIsSendingEmail(false);
                return;
            }
            const logoBlock = AGENCY.logo
                ? `<div style="text-align:center;padding:30px 0 10px;"><img src="${AGENCY.logo}" style="max-height:70px;width:auto;" alt="${AGENCY.name}" /></div>`
                : `<div style="text-align:center;padding:30px 0 10px;"><div style="width:60px;height:60px;background:#e8f0fe;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;color:#2b6cee;">${AGENCY.name.charAt(0)}</div></div>`;
            const statusIcon = viewingContract.signatureStatus === 'signed'
                ? `<span style="display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;color:#059669;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;"><span style="font-size:16px;">âœ“</span> Assinado</span>`
                : `<span style="display:inline-flex;align-items:center;gap:6px;background:#fef3c7;color:#d97706;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;"><span style="font-size:16px;">â³</span> Pendente</span>`;

            const plainText = `OlÃ¡ ${viewingContract.clientName},

A ${AGENCY.name} disponibilizou para vocÃª o contrato do imÃ³vel ${viewingContract.propertyTitle} para assinatura digital.

Acesse o link abaixo para ler, assinar e baixar o documento:
${contractUrl}

---
${AGENCY.name} Â· EstateFlow Suite
Este Ã© um email automÃ¡tico. Por favor nÃ£o responda.`;

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
                                            <td style="padding:6px 0;color:#64748b;font-size:13px;">ImÃ³vel</td>
                                            <td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px;color:#0f172a;">${viewingContract.propertyTitle}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:6px 0;color:#64748b;font-size:13px;">Cliente</td>
                                            <td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px;color:#0f172a;">${viewingContract.clientName}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:6px 0;color:#64748b;font-size:13px;">ProprietÃ¡rio</td>
                                            <td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px;color:#0f172a;">${viewingContract.ownerName}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:6px 0;color:#64748b;font-size:13px;">Tipo</td>
                                            <td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px;color:#0f172a;">${viewingContract.type === 'rent' ? 'LocaÃ§Ã£o' : 'Venda'}</td>
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

                                <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 8px;">OlÃ¡ <strong style="color:#0f172a;">${viewingContract.clientName}</strong>,</p>
                                <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 24px;">
                                    A <strong style="color:#0f172a;">${AGENCY.name}</strong> disponibilizou para vocÃª o contrato do imÃ³vel <strong>${viewingContract.propertyTitle}</strong> 
                                    para assinatura digital. Clique no botÃ£o abaixo para acessar, ler, assinar e baixar o documento.
                                </p>

                                <div style="text-align:center;margin:32px 0;">
                                    <a href="${contractUrl}" style="display:inline-block;background:linear-gradient(135deg,#2b6cee,#1a4fbf);color:#ffffff;padding:16px 48px;border-radius:14px;text-decoration:none;font-size:16px;font-weight:700;box-shadow:0 4px 14px rgba(43,108,238,0.35);">
                                        Acessar e Assinar
                                    </a>
                                </div>

                                <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:28px;">
                                    <p style="font-size:13px;color:#92400e;margin:0;line-height:1.5;">
                                        <strong>SeguranÃ§a:</strong> Sua assinatura digital tem validade jurÃ­dica. 
                                        O documento ficarÃ¡ disponÃ­vel para download apÃ³s a assinatura.
                                    </p>
                                </div>

                                <p style="font-size:13px;color:#94a3b8;margin:0 0 12px;">Se o botÃ£o acima nÃ£o funcionar, copie e cole este link no navegador:</p>
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
                alert('Erro ao enviar email. Verifique as configuraÃ§Ãµes de SMTP.');
            }
        } catch (e) {
            console.error('Erro ao enviar email:', e);
            alert('Erro de conexÃ£o ao enviar email.');
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
                            <span className="material-symbols-outlined text-primary">gavel</span> GestÃ£o JurÃ­dica
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">EmissÃ£o e controle de contratos oficiais.</p>
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
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span> Voltar Ã  Lista
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
                                        <p className="text-xs font-bold text-slate-500 uppercase">RenovaÃ§Ã£o Pendente</p>
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
                                    { id: 'rent', label: 'LocaÃ§Ã£o' },
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
                                                        <p className="text-xs text-slate-500 font-medium">{dynamicTemplates[contract.templateType || 'rent_residential']?.title}</p>
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
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contrato / ImÃ³vel</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Partes</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Valor</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">AÃ§Ãµes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredContracts.map(contract => (
                                                <tr key={contract.id} className="hover:bg-slate-50 dark:hover:bg-[#20242c] transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-sm">{contract.propertyTitle}</div>
                                                        <div className="text-[10px] text-slate-400">{dynamicTemplates[contract.templateType || 'rent_residential']?.title}</div>
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
                                    <p className="text-sm text-slate-500">Preencha os dados para gerar o documento jurÃ­dico.</p>
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
                                                 <label className="text-xs font-bold text-slate-500 uppercase">ImÃ³vel</label>
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
                                                 <label className="text-xs font-bold text-slate-500 uppercase">ProprietÃ¡rio</label>
                                                 <select required={!!dynamicTemplates[selectedTemplate]?.requiresOwner} className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.ownerId} onChange={e => setFormData({ ...formData, ownerId: e.target.value })}>
                                                     <option value="">Selecione...</option>
                                                     {users.filter(u => u.role === 'owner' || u.role === 'admin').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                 </select>
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Valor (R$)</label>
                                                 <input type="number" required className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} />
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Data de InÃ­cio</label>
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
                                             <label className="text-xs font-bold text-slate-500 uppercase">EdiÃ§Ã£o Final do Documento</label>
                                             <button type="button" onClick={() => setCreationStep('form')} className="text-xs text-primary font-bold flex items-center gap-1">
                                                 <span className="material-symbols-outlined text-sm">edit</span> Alterar Dados
                                             </button>
                                         </div>
                                         <textarea 
                                             className="w-full min-h-[300px] max-h-[70vh] h-[500px] p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 font-serif text-sm leading-relaxed focus:outline-none focus:border-primary/50"
                                             value={currentText}
                                             onChange={(e) => setCurrentText(e.target.value)}
                                         />
                                         <p className="text-[10px] text-slate-400">VocÃª pode revisar e alterar qualquer parte do texto acima antes de finalizar o contrato.</p>
                                     </div>
                                 )}

                                 <div className="flex gap-4 pt-6">
                                     <button type="button" onClick={() => { setViewMode('list'); setCreationStep('form'); }} className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                                     <button type="submit" className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-colors">
                                         {creationStep === 'form' ? 'Revisar Documento' : (editingContract ? 'Salvar AlteraÃ§Ãµes' : 'Finalizar e Gerar Contrato')}
                                     </button>
                                 </div>
                             </form>
                        </div>
                    )}

                    {viewMode === 'view' && viewingContract && (
                        <div className="flex flex-col lg:flex-row gap-8 h-full min-h-0">
                            {/* Document Preview (A4 Simulado) */}
                            <div ref={previewContainerRef} className="flex-1 rounded-2xl p-4 lg:p-8 overflow-x-auto overflow-y-auto flex justify-start lg:justify-center bg-slate-200/50 dark:bg-black/20 custom-scrollbar relative">
                                
                                <div id="printable-area" className="flex flex-col gap-0 items-center" style={{ transform: `scale(${a4Scale})`, transformOrigin: 'top left', width: a4Scale < 1 ? `${210 * 3.7795 * a4Scale}px` : '210mm' }}>
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
                                                            {dynamicTemplates[viewingContract.templateType || 'rent_residential']?.title}
                                                        </h1>
                                                    )}

                                                    <div className="text-justify text-[11pt] leading-relaxed font-serif whitespace-pre-wrap flex-1">
                                                        {content}
                                                    </div>

                                                    {idx === pages.length - 1 && (
                                                        <div className="mt-12 pt-10">
                                                            <p className="text-right mb-16 font-serif italic text-sm">SÃ£o Paulo, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                                                            
                                                            <div className="grid grid-cols-2 gap-8 mt-10">
                                                                 <div className="text-center">
                                                                     <div className="h-20 flex flex-col items-center justify-center mb-2">
                                                                         {viewingContract.ownerSignatureImage ? (
                                                                             <img src={viewingContract.ownerSignatureImage} className="h-8 object-contain" alt="Assinatura ImobiliÃ¡ria" />
                                                                         ) : AGENCY.stampUrl ? (
                                                                             <img src={AGENCY.stampUrl} className="h-8 object-contain" alt="Rubrica" />
                                                                         ) : (
                                                                             <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">[Pendente]</span>
                                                                         )}
                                                                     </div>
                                                                     <div className="border-t border-black w-full pt-1">
                                                                         <p className="font-bold text-[10px] uppercase">{AGENCY.stampName}</p>
                                                                         <p className="text-[9px]">ImobiliÃ¡ria</p>
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
                                                        PÃ¡gina {idx + 1} de {pages.length} | Documento #{viewingContract.id} | EstateFlow Suite
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
                                    <h3 className="font-bold text-lg mb-4">AÃ§Ãµes JurÃ­dicas</h3>
                                    
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
                                                    <span className="material-symbols-outlined">draw</span> Assinar como ImobiliÃ¡ria
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
                                                    <span className="material-symbols-outlined text-[18px]">edit_note</span> Editar ClÃ¡usulas
                                                </button>

                                            </>
                                        )}
                                    </div>

                                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800">
                                        <p className="text-[10px] text-amber-600 font-bold uppercase mb-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">shield_person</span> SeguranÃ§a de Dados
                                        </p>
                                        <p className="text-[11px] text-amber-800 dark:text-amber-500 leading-tight">
                                            Assinaturas colhidas sÃ£o criptografadas e vinculadas ao CPF do signatÃ¡rio para validade jurÃ­dica plena (MP 2.200-2/2001).
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
