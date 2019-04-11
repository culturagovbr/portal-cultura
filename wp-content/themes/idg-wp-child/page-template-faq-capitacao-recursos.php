<?php /* Template Name: FAQ CAPTACAO RECURSOS */ ?>

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
<!--             <div id="accordionExample" class="accordion">
               <div class="card">
                  <div id="faq-15" class="card-header">
                     <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-faq-15" aria-expanded="false" aria-controls="collapse-faq-15"><span>O próprio proponente do projeto pode captar os recursos para a sua execução?</span></a></h3>
                  </div>
                  <div id="collapse-faq-15" class="collapse" aria-labelledby="faq-15" data-parent="#accordionExample">
                     <div class="card-body">
                        <p>Sim. O profissional que captar os recursos para o projeto – seja ele o próprio proponente ou alguém contratado exclusivamente com este objetivo – poderá ser remunerado até o limite de 10% do valor do Custo do Projeto, sendo o teto do valor da remuneração de R$ 150 mil.</p>
                        <p>Este percentual pode ser expandido quando o projeto é realizado fora do eixo Rio-São Paulo, nas seguintes regiões do País:</p>
                        <p>15% do valor total do custo do projeto para projetos executados nas Regiões Norte, Nordeste e Centro-Oeste;</p>
                        <p>12,5% para os projetos realizados na Região Sul e nos estados de Minas Gerais e Espírito Santo.</p>
                        <p>Os valores destinados à remuneração para captação de recursos somente poderão ser pagos proporcionalmente às parcelas já captadas.</p>
                     </div>
                  </div>
               </div>
            </div> -->

            <div id="accordionExample" class="accordion">
               <div class="card">
                  <div id="faq-16" class="card-header">
                     <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-faq-16" aria-expanded="false" aria-controls="collapse-faq-16"><span>Qual o prazo máximo para captação dos recursos para o projeto?</span></a></h3>
                  </div>
                  <div id="collapse-faq-16" class="collapse" aria-labelledby="faq-16" data-parent="#accordionExample">
                     <div class="card-body">
                        <p>O prazo máximo de captação dos recursos, com eventuais prorrogações, é 36 meses a partir da data de publicação da Portaria de autorização para captação de recursos. Pedido de prorrogação do prazo deverá ser feito no cadastramento da proposta.</p>
                        <p>Para projetos que não tenham sinalizado a prorrogação do prazo no sistema no momento da apresentação da proposta, o proponente deve registrar a solicitação com as devidas atualizações no cronograma de execução, com antecedência mínima de 30 dias da data prevista para o encerramento do prazo.</p>
                     </div>
                  </div>
               </div>
            </div>

            <div id="accordionExample" class="accordion">
               <div class="card">
                  <div id="faq-17" class="card-header">
                     <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-faq-17" aria-expanded="false" aria-controls="collapse-faq-17"><span>Em que momento, o proponente pode começar a captar recursos para o projeto?</span></a></h3>
                  </div>
                  <div id="collapse-faq-17" class="collapse" aria-labelledby="faq-17" data-parent="#accordionExample">
                     <div class="card-body">
                        <p>A captação poderá ser iniciada imediatamente depois da aprovação do projeto. É necessário que uma Portaria de Autorização para Captação de Recursos Incentivados seja publicada pela Secretaria Especial da Cultura no Diário Oficial da União (DOU). A partir da abertura da conta vinculada, recursos podem ser depositados para a execução do projeto.</p>
                        <p>Caso alguma despesa do projeto seja executada no período entre a autorização para captar recursos e a homologação da execução pela CNIC, esses recursos serão ressarcidos.</p>
                        <p>Não serão ressarcidas as despesas realizadas antes de publicada a autorização de captação pelo MinC e as realizadas por projetos que não sejam homologados.</p>

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



