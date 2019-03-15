<?php /* Template Name: FAQ CATEGORIAS */ ?>

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

          <div class="entry-content">

            <div class="row mb-4">
              <div class="col">
                <div class="feature-card text-center card-1">
                  <a href="<?php echo get_bloginfo('url'); ?>/perguntas-frequentes/perguntas-gerais">
                    <div class="align">
                      <h3 class="card-title">Perguntas Gerais</h3>
                    </div>
                  </a>
                </div>
              </div>
              <div class="col">
                <div class="feature-card text-center card-1">
                  <a href="<?php echo get_bloginfo('url'); ?>/perguntas-frequentes/apresentacao-de-projetos">
                    <div class="align">
                      <h3 class="card-title">Apresentação de Projetos</h3>
                    </div>
                  </a>
                </div>
              </div>
              <div class="col">
                <div class="feature-card text-center card-1">
                  <a href="<?php echo get_bloginfo('url'); ?>/perguntas-frequentes/aprovacao-de-projetos">
                    <div class="align">
                      <h3 class="card-title">Aprovação de Projetos</h3>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            <div class="row mb-5">
              <div class="col">
                <div class="feature-card text-center card-1">
                  <a href="<?php echo get_bloginfo('url'); ?>/perguntas-frequentes/captacao-de-recursos">
                    <div class="align">
                      <h3 class="card-title">Captação de Recursos</h3>
                    </div>
                  </a>
                </div>
              </div>
              <div class="col">
                <div class="feature-card text-center card-1">
                  <a href="<?php echo get_bloginfo('url'); ?>/perguntas-frequentes/execucao-dos-projetos">
                    <div class="align">
                      <h3 class="card-title">Execução dos Projetos</h3>
                    </div>
                  </a>
                </div>
              </div>
              <div class="col">
                <div class="feature-card text-center card-1">
                  <a href="<?php echo get_bloginfo('url'); ?>/perguntas-frequentes/promocao-do-patrocinador">
                    <div class="align">
                      <h3 class="card-title">Promoção do Patrocinador</h3>
                    </div>
                  </a>
                </div>
              </div>
            </div>

          </div>

        </article>

      </div>
    </div>

  </div>

</main>

<?php get_footer(); ?>



