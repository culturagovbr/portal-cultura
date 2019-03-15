<?php /* Template Name: FAQ APROVACAO PROJETOS */ ?>

<?php get_header(); ?>

<main id="main-single" class="site-main">
  <div class="container" id="page-faq">
    <div class="row">
      <?php the_breadcrumb(); ?>
    </div>

    <?php wp_reset_postdata(); ?>

    <div class="row">
      <div class="col-12">

        <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>

          <header class="entry-header">
            <?php the_title( '<h1 class="entry-title">', '</h1>' ); ?>
          </header>


          <div class="entry-content mb-5">
            <div id="accordionExample" class="accordion">
               <div class="card">
                  <div id="faq-13" class="card-header">
                     <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-faq-13" aria-expanded="false" aria-controls="collapse-faq-13"><span>Quais as etapas de aprovação de um projeto?</span></a></h3>
                  </div>
                  <div id="collapse-faq-13" class="collapse" aria-labelledby="faq-13" data-parent="#accordionExample">
                     <div class="card-body">
                        <p>Apresentação de proposta: O proponente (responsável pelo projeto) insere uma proposta cultural no Sistema de Apoio às Leis de Incentivo à Cultura (Salic), de forma eletrônica. Devem ser preenchidos campos previamente definidos, tais como resumo, ficha técnica, orçamento, plano de distribuição de produtos/ingressos, e apresentados documentos obrigatórios de acordo com a área do projeto, conforme determinação da Instrução Normativa da Lei Federal de Incentivo à Cultura vigente.</p>

                        <p>Análise de admissibilidade: a Secretaria Especial da Cultura do Ministério da Cidadania realiza a análise de admissibilidade da proposta a partir de critérios objetivos estabelecidos pela Lei 8.313/91 e pela Instrução Normativa em vigor, como, por exemplo:</p>
                        <p>Verificação do completo e correto preenchimento do formulário de apresentação da proposta cultural;</p>
                        <p>Análise quanto ao enquadramento do proponente e da proposta cultural;</p>
                        <p>Caso seja admitida, a proposta recebe um número de Pronac</p>
                        <p>Prazo: até 60 dias, podendo ser ampliado para até 120 dias quando os projetos forem de restauração do patrimônio histórico ou construção de imóveis.
                        Após a admissibilidade, o MinC publica portaria de autorização para captação de recursos incentivados no Diário Oficial da União (DOU).</p>
                        <p>Análise técnica: o projeto é encaminhado à análise técnica por parecerista da área cultural do projeto. São analisados requisitos como:</p>
                        <p>Atendimento aos objetivos do incentivo fiscal da Lei Federal de Incentivo à Cultura;</p>
                        <p>Suficiência das informações prestadas;</p>
                        <p>Aferição da capacidade técnica do proponente para execução do projeto apresentado;</p>
                        <p>Adequação do projeto às medidas de acessibilidade e democratização de acesso ao público;</p>
                        <p>Compatibilidade dos custos previstos no projeto com os preços praticados no mercado regional da produção, conforme métrica estabelecida pelo MinC – o que se mostrar inadequado pode sofrer cortes justificados pelo parecerista;</p>
                        <p>Relação custo/benefício do projeto no âmbito cultural, incluindo o impacto da utilização do mecanismo de incentivo fiscal na redução do preço final de produtos ou serviços culturais com público pagante, podendo o parecerista propor redução nos preços solicitados;</p>
                        <p>Atendimento aos critérios e limites de custos estabelecidos pela Lei e Instrução Normativa em vigor;</p>
                        <p>Prazo: até 30 dias do seu recebimento, podendo ser prorrogado por mais 120 dias quando se tratar de projeto de recuperação de patrimônio histórico ou construção de imóveis.</p>
                        <p>Nos casos de projetos culturais que tenham como objeto a preservação de bens culturais tombados ou registrados pelos poderes públicos (federal, estadual, distrital ou municipal), será obrigatória, também, a apreciação pelo órgão responsável pelo tombamento ou registro.</p>
                        <p>Análise pela CNIC: Após emissão do parecer técnico, o projeto cultural será apreciado pela Comissão Nacional de Incentivo à Cultura (CNIC), que homologa a execução do projeto.</p>
                        <p>A CNIC é um colegiado de assessoramento de caráter paritário, formado por representantes dos setores artísticos, culturais e empresariais, em paridade da sociedade civil e do poder público;</p>
                        <p>Analisa os projetos culturais, inclusive sob seus aspectos orçamentários, podendo para tanto solicitar informações adicionais, diligenciando o proponente, emitindo parecer conclusivo pela aprovação, total ou parcial, ou rejeição do projeto cultural.</p>
                        <p>Decisão final: o ministro de Estado da Cultura, em última instância, decide quanto à aprovação ou rejeição do projeto cultural. Historicamente, por convenção, o MinC acompanha a decisão do órgão consultivo. Excepcionalmente, é possível que o ministro decida de forma diferente, fundamentando a justificativa.</p>
                     </div>
                  </div>
               </div>
            </div>

            <div id="accordionExample" class="accordion">
               <div class="card">
                  <div id="faq-14" class="card-header">
                     <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-faq-14" aria-expanded="false" aria-controls="collapse-faq-14"><span>Por que é obrigatória a contratação de profissionais de contabilidade e de advocacia para realização do projeto?</span></a></h3>
                  </div>
                  <div id="collapse-faq-14" class="collapse" aria-labelledby="faq-14" data-parent="#accordionExample">
                     <div class="card-body">
                        <p>O desconhecimento de preceitos legais e contábeis ou a inobservância de alguns itens na realização dos projetos pode causar prejuízos à sua execução, resultando em reprovação e devolução de recursos ao erário. A Instrução Normativa da Lei Federal de Incentivo à Cultura permite que o contador seja do quadro de funcionários da empresa do proponente da proposta cultural.</p>
                     </div>
                  </div>
               </div>
            </div>

            <p class="mt-4"><a href="<?php echo get_bloginfo('url'); ?>/perguntas-frequentes">&larr; Voltar para perguntas frequentes</a>
          </div>

        </article>

      </div>
    </div>

  </div>

</main>

<?php get_footer(); ?>



