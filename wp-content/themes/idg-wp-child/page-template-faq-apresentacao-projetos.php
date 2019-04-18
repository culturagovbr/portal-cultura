<?php /* Template Name: FAQ APRESENTACAO PROJETOS */ ?>

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
                  <div id="faq-7" class="card-header">
                     <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-faq-7" aria-expanded="false" aria-controls="collapse-faq-7"><span>É preciso comprovar experiência na área para apresentar uma proposta a Secretaria?</span></a></h3>
                  </div>
                  <div id="collapse-faq-7" class="collapse" aria-labelledby="faq-7" data-parent="#accordionExample">
                     <div class="card-body">
                        <p>A comprovação de experiência não é necessária para a admissão do primeiro projeto de realizadores culturais recém-inseridos no mercado. Com esta regra, a Secretaria busca apoiar novos empreendedores com bons projetos para que se consolidem. Apoiar o jovem empreendedor gera maiores possibilidades de atuação no campo da inovação.</p>
                        <p>No caso de proponentes experientes, a experiência em atividades culturais deve ser comprovada no ato de inscrição da proposta.</p>
                        <p>No caso de pessoa jurídica, a comprovação é realizada por meio do código de Classificação Nacional de Atividades Econômicas (CNAE), referente à área cultural nos registros do CNPJ da instituição.</p>
                     </div>
                  </div>
               </div>
            </div>

            <div id="accordionExample" class="accordion">
               <div class="card">
                  <div id="faq-8" class="card-header">
                     <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-faq-8" aria-expanded="false" aria-controls="collapse-faq-8"><span>Qual é o período do ano em que as propostas devem ser apresentadas à Secretaria Especial da Cultura?</span></a></h3>
                  </div>
                  <div id="collapse-faq-8" class="collapse" aria-labelledby="faq-8" data-parent="#accordionExample">
                     <div class="card-body">
                        <p>As propostas culturais podem ser cadastradas no Sistema de Incentivo às Leis da Cultura (SALIC) de 1º de fevereiro a 30 de novembro de cada ano.</p>
                     </div>
                  </div>
               </div>
            </div>

            <div id="accordionExample" class="accordion">
               <div class="card">
                  <div id="faq-9" class="card-header">
                     <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-faq-9" aria-expanded="false" aria-controls="collapse-faq-9"><span>Há um valor máximo por projeto?</span></a></h3>
                  </div>
                  <div id="collapse-faq-9" class="collapse" aria-labelledby="faq-9" data-parent="#accordionExample">
                     <div class="card-body">
                        <p>Sim, o valor máximo para um projeto é de R$ 1 milhões.</p>
                     </div>
                  </div>
               </div>
            </div>

            <div id="accordionExample" class="accordion">
               <div class="card">
                  <div id="faq-10" class="card-header">
                     <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-faq-10" aria-expanded="false" aria-controls="collapse-faq-10"><span>Há exceções a esse valor máximo?</span></a></h3>
                  </div>
                  <div id="collapse-faq-10" class="collapse" aria-labelledby="faq-10" data-parent="#accordionExample">
                     <div class="card-body">
                        <p>Sim, não se enquadram nesse teto projetos relacionados à manutenção, preservação e conservação do patrimônio cultural, planos anuais, exposições e atividades relacionadas aos acervos museológicos, construção e implantação de instituições culturais.  </p>
                     </div>
                  </div>
               </div>
            </div>

            <div id="accordionExample" class="accordion">
               <div class="card">
                  <div id="faq-11" class="card-header">
                     <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-faq-11" aria-expanded="false" aria-controls="collapse-faq-11"><span>Há limites de quantidade de propostas apresentadas e de valor a ser captado pelos proponentes?</span></a></h3>
                  </div>
                  <div id="collapse-faq-11" class="collapse" aria-labelledby="faq-7" data-parent="#accordionExample">
                     <div class="card-body">
                        <p>Sim, há no número de projetos que um mesmo proponente pode apresentar e no valor máximo da soma dos projetos por perfil de proponente:
                        Para a Pessoa Física e para o Empresário Individual com enquadramento em Microempresário Individual (MEI), o valor máximo é de R$ 1,5 milhão para até quatro projetos por ano;</p>
                        <p><u>Para os demais enquadramentos de Empresário Individual, o valor máximo é de R$ 7, 5 milhões para até oito projetos por ano. </u>
                        <p><u>Para a Empresa Individual de Responsabilidade Limitada (EIRELI), Sociedades Limitadas (Ltda.) e demais Pessoas Jurídicas, o valor máximo é de R$ 10 milhões para até 16 projetos por ano.</u></p>
                     </div>
                  </div>
               </div>
            </div>

<!--             <div id="accordionExample" class="accordion">
               <div class="card">
                  <div id="faq-12" class="card-header">
                     <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-faq-12" aria-expanded="false" aria-controls="collapse-faq-12"><span>Esses limites podem ser ultrapassados? Em quais situações?</span></a></h3>
                  </div>
                  <div id="collapse-faq-12" class="collapse" aria-labelledby="faq-12" data-parent="#accordionExample">
                     <div class="card-body">
                        <p>Os limites podem ser ultrapassados caso o projeto cultural seja realizado em espaços públicos ou nas regiões do País mais carentes de projetos Culturais.
                        No caso de espaços públicos, o limite pode ser acrescido de:</p>
                        <p>Mais dois projetos para Pessoa Física e Empresário Individual com enquadramento em Microempresário Individual (MEI), mantidos os limites orçamentários;</p>
                        <p>Mais três projetos para demais enquadramentos de Empresário Individual, mantidos os limites orçamentários;</p>
                        <p>Mais quatro projetos para Empresa Individual de Responsabilidade Limitada (EIRELI), Sociedades Limitadas (Ltda.) e demais Pessoas Jurídicas, mantidos os limites orçamentários.</p>
                        <p>Os limites podem ser ultrapassados nas seguintes regiões:</p>
                        <p>Na Região Sul do País e estados de Espírito Santo e Minas Gerais – aumento de até 25% nos limites;</p>
                        <p>Nas Regiões Norte, Nordeste e Centro-Oeste: aumento de até 50% nos limites.</p>
                        <p>Essa extensão dos limites não contempla projetos relativos à realização de planos anuais e plurianuais de atividades; e a conservação e restauração de imóveis, monumentos, espaços e demais objetos tombados por qualquer das esferas de poder.</p>
                        <p>Exceções aos limites podem ser autorizadas pela área técnica do MinC em projetos de preservação de acervos e exposições organizadas com acervos museológicos de reconhecido valor cultural e de construção e implantação de equipamentos culturais de reconhecido valor cultural.</p>
                     </div>
                  </div>
               </div>
            </div> -->

            <p class="mt-4"><a href="<?php echo get_bloginfo('url'); ?>/perguntas-frequentes">&larr; Voltar para perguntas frequentes</a>
          </div>

        </article>

      </div>
    </div>

  </div>

</main>

<?php get_footer(); ?>



