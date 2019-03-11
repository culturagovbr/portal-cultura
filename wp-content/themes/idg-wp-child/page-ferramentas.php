<?php /* Template Name: Ferramentas */ ?>

<?php get_header(); ?>

<main id="ferramentas" class="site-main">
  <div class="container">
    <div class="row">
      <?php the_breadcrumb(); ?>
    </div>

    <?php wp_reset_postdata(); ?>

  </div>


  <section class="image-and-text">

    <div class="container image-right no-border align-center">
      <div class="col-image text-center">
        <div class="box">
          <div class="img-wrapper mb-3" style="background-image: url('<?php echo get_template_directory_uri(); ?>/assets/img/salic.jpg'); border: 1px solid #CCC;"></div>
        </div>
      </div>

      <div class="col-text">
        <h2 class="section-title mb-5">Salic</h2>
        <p>O Sistema de Acesso às Leis de Incentivo à Cultura (Salic) é o local de cadastro das propostas. No Salic, são transitadas todas as fases do projeto, desde o cadastramento, passando pela aprovação, execução e prestação de contas. É também o principal veículo de comunicação entre o proponente e a equipe da Secretaria de Fomento e Incentivo à Cultura (Sefic) da Secretaria da Cultura, responsável pela gestão da Lei de Incentivo à Cultura.</p>
      </div>
    </div>
  </section>

  <section class="image-and-text bg-grey-2">

    <div class="container image-left no-border align-center">
      <div class="col-image text-center">
        <div class="box">
          <div class="img-wrapper mb-3" style="background-image: url('<?php echo get_template_directory_uri(); ?>/assets/img/salic_versalic.jpg'); border: 1px solid #CCC;"></div>
        </div>
      </div>

      <div class="col-text">
        <h2 class="section-title mb-5">Versalic</h2>
        <p>Todas as informações sobre propostas apresentadas e projetos aprovados pela Lei de Incentivo à Cultura estão disponíveis ao público no Versalic. São disponibilizados dados básicos sobre a captação e execução dos projetos, que podem ser consultados a partir do nome do projeto, do proponente ou do incentivador, por exemplo.</p>
      </div>
    </div>
  </section>

  <section class="image-and-text">

    <div class="container image-right no-border align-center">
      <div class="col-image text-center">
        <div class="box">
          <div class="img-wrapper mb-3" style="background-image: url('<?php echo get_template_directory_uri(); ?>/assets/img/salic_compara.jpg'); border: 1px solid #CCC;"></div>
        </div>
      </div>

      <div class="col-text">
        <h2 class="section-title mb-5">Salic Comparar</h2>
        <p>Aqui estão os principais indicadores da Lei de Incentivo à Cultura, que podem ser organizados de diversas formas: projetos apresentados e aprovados por ano e mês, por estado e região, ou até mesmo por área – como audiovisual, patrimônio e música. Valores e dados sobre captadores e incentivadores são atualizados diariamente.</p>
      </div>
    </div>
  </section>

  <section class="image-and-text bg-grey-2">

    <div class="container image-left no-border align-center">
      <div class="col-image text-center">
        <div class="box">
          <div class="img-wrapper mb-3" style="background-image: url('<?php echo get_template_directory_uri(); ?>/assets/img/salic_mobile.jpg'); border: 1px solid #CCC;"></div>
        </div>
      </div>

      <div class="col-text">
        <h2 class="section-title mb-5">Salic Mobile</h2>
        <p>O Sistema de Acesso às Leis de Incentivo à Cultura (Salic) conta com a versão para acesso remoto. Pelo celular, o proponente pode acompanhar o andamento de seu projeto, além de ter a possibilidade de fazer upload de documentos e notas fiscais, entre outras funcionalidades. Trata-se de uma facilidade a mais para os usuários do sistema.</p>
      </div>
    </div>
  </section>


</main>

<?php get_footer(); ?>



