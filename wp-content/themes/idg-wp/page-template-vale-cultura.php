<?php /* Template Name: Vale Cultura */ ?>

<?php get_header(); ?>

<main id="page-imprensa" class="site-main">
  <div class="container">
    <div class="row">
      <?php the_breadcrumb(); ?>
    </div>

    <?php wp_reset_postdata(); ?>

  </div>

  <div id="content">
    <div class="container">
      <header class="entry-header">
        <h1 class="entry-title text-center"><?php the_title(); ?></h1>
      </header>
    </div>
  </div>

  <div id="carouselExampleFade" class="carousel slide carousel-fade" data-ride="carousel">
    <div class="carousel-inner">
      <div class="carousel-item active">
        <img class="d-block w-100" src="<?php echo get_template_directory_uri() ?>/assets/img/01_banner_inicio-01.jpg">
      </div>

      <div class="carousel-item">
        <img class="d-block w-100" src="<?php echo get_template_directory_uri() ?>/assets/img/2_infografico-inicio-1.jpg">
      </div>
      <div class="carousel-item">
        <img class="d-block w-100" src="<?php echo get_template_directory_uri() ?>/assets/img/2_infografico-inicio-2.jpg" alt="Third slide">
      </div>
    </div>
    <a class="carousel-control-prev" href="#carouselExampleFade" role="button" data-slide="prev">
      <span class="carousel-control-prev-icon" aria-hidden="true"></span>
      <span class="sr-only">Previous</span>
    </a>
    <a class="carousel-control-next" href="#carouselExampleFade" role="button" data-slide="next">
      <span class="carousel-control-next-icon" aria-hidden="true"></span>
      <span class="sr-only">Next</span>
    </a>
  </div>

  <div id="vale-cultura">

    <div id="menu-vale">
      <div class="container">
        <ul>
          <li><a class="scrollLink" href="#o-que-e">O que é?</a></li>
          <li><a class="scrollLink" href="#como-funciona">Como Funciona</a></li>
          <li><a class="scrollLink" href="#onde-cadastrar">Onde Cadastrar</a></li>
          <li><a class="scrollLink" href="#beneficios">Benefícios</a></li>
          <!-- <li><a class="scrollLink" href="#depoimentos">Depoimentos</a></li> -->
          <li><a class="scrollLink" href="#saiba-mais">Saiba Mais</a></li>
          <li><a class="scrollLink" href="#perguntas-frequentes">Perguntas Frequentes</a></li>
        </ul>
      </div>
    </div>

    <section class="image-and-text" id="o-que-e">

      <div class="container image-right align-center no-border">
        <div class="col-image text-center">
          <div class="box">
            <div class="img-wrapper mb-3 mt-0" style="background-image: url('<?php echo get_template_directory_uri() ?>/assets/img/oquee.jpg'); border: 1px solid #CCC;">
            </div>
          </div>
        </div>

        <div class="col-text">
          <h2 class="section-title mb-5">O que é o Vale-Cultura?</h2>

          <p>É um benefício de 50 reais mensais concedido pelo empregador aos seus trabalhadores para o uso exclusivo em aquisição de bens e serviços culturais. É cumulativo e sem prazo de validade.</p>

          <p>O Programa de Cultura do Trabalhador – Vale-Cultura foi instituído pela <a href="www.planalto.gov.br/ccivil_03/_Ato2011-2014/2012/Lei/L12761.htm" target="_blank">Lei 12.761/2012</a> e está em pleno vigor. O objetivo é garantir o acesso a diversas atividades culturais desenvolvidas no Brasil. </p>

          <p>Todos os trabalhadores que tenham vínculo empregatício formal com as empresas que aderiram ao programa podem receber o benefício. O foco são aqueles que recebem até cinco salários mínimos para estimular o acesso à cultura aos cidadãos de baixa e média renda.</p>

          <p>O Vale-Cultura incentiva a vida cultural, transforma o sentido do trabalho e promove a universalização do acesso à cultura. Ganha o trabalhador, ganha a empresa e ganha o Brasil!</p>

        </div>
      </div>
    </section>

    <section class="image-and-text bg-grey-2" id="como-funciona">

      <div class="container image-right align-center no-border">
        <div class="col-image text-center">
          <div class="box">
            <div class="img-wrapper mb-3 mt-0" style="background-image: url('<?php echo get_template_directory_uri() ?>/assets/img/comofunciona.jpg'); border: 1px solid #CCC;">
            </div>
          </div>
        </div>

        <div class="col-text">
          <h2 class="section-title mb-5">Como funciona o Vale-Cultura?</h2>
          <p>Primeiro, você deverá identificar qual o seu perfil no programa:</p>

          <ul>
            <li>Beneficiária: Empresa que deseja conceder o benefício para seus trabalhadores, devidamente cadastrada no programa; saiba mais:</li>
            <li>Operadora: Empresa cadastrada no programa e autorizada a emitir o cartão; saiba mais:</li>
            <li>Recebedora: Empresa habilitada por operadora cuja atividade econômica e produtos constem da lista do programa; saiba mais:</li>
            <li>Usuário: Trabalhador com vínculo empregatício com a beneficiária. saiba mais:</li>
          </ul>

          <p>Após identificar o seu perfil, somente as beneficiárias e operadoras deverão se cadastrar no sistema do <a href="http://vale.cultura.gov.br/" target="_blank">Vale-Cultura</a>.</p>
          <p>A Coordenação-Geral do Programa de Cultura do Trabalhador/SEFIC irá analisar o cadastro. Após a aprovação, a empresa beneficiária deverá contratar operadora que esteja cadastrada no <a href="http://vale.cultura.gov.br/" target="_blank">Programa</a>.</p>
          <p>As empresas recebedoras deverão fazer contato com as operadoras ativas no programa, bem como verificar a compatibilidade da sua CNAE</p>
          <p>A fiscalização do programa compete aos Ministérios da Cidadania (Secretaria Especial da Cultura) e da Economia (Secretaria Especial da Fazenda e Secretaria do Trabalho), conforme previsto na legislação vigente. A Secretaria Especial da Cultura é a responsável pela fiscalização do uso do Vale-Cultura para a aquisição de bens e serviços culturais.</p>
          <p>Desta forma, é fundamental a observância do uso adequado do benefício por parte de todos os envolvidos para que o programa não perca o seu objetivo que é garantir a democratização de acesso a bens e produtos culturais.</p>
        </div>
      </div>
    </section>

    <section class="image-and-text" id="onde-cadastrar">

      <div class="container image-left align-center no-border">
        <div class="col-image text-center">
          <div class="box">
            <div class="img-wrapper mb-3 mt-0" style="background-image: url('<?php echo get_template_directory_uri() ?>/assets/img/ondecadastrar.jpg'); border: 1px solid #CCC;">
            </div>
          </div>
        </div>

        <div class="col-text">
          <h2 class="section-title mb-5">Onde cadastrar?</h2>

          <ul>
            <li>Acesse o sistema do <a href="http://vale.cultura.gov.br" target="_blank">Vale-Cultura</a></li>
            <li>No menu, clique no link "Cadastrar Beneficiária" ou Cadastrar Operadora”;</li>
            <li>Preencha o formulário com os dados solicitados.</li>
            <li>Salvar e encaminhar para análise</li>
          </ul>

        </div>
      </div>
    </section>

    <section class="image-and-text bg-grey-2" id="beneficios">
      <h2 class="section-title mb-5 text-center">Benefícios</h2>

      <div class="container image-left align-center no-border">
        <div class="row">
          <div class="col">
            <div class="box">
              <div class="image-wrapper">
                <img src="<?php echo get_template_directory_uri() ?>/assets/img/5_trabalhador.jpg" />
              </div>

              <div class="text">
                <h2>Para o trabalhador</h2>
                <ul>
                  <li>Mais acesso a produtos e eventos culturais;</li>
                  <li>Auxilia na sua formação educacional e social;</li>
                  <li>Melhoria da qualidade de vida do trabalhador e de sua família;</li>
                  <li>Desenvolve o seu pensamento crítico e criativo;</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="col">
            <div class="box">
              <div class="image-wrapper">
                <img src="<?php echo get_template_directory_uri() ?>/assets/img/5_empregador.jpg" />
              </div>

              <div class="text">
                <h2>Para os empregadores</h2>
                <ul>
                  <li>Melhoria do relacionamento com os seus funcionários;</li>
                  <li>Atração e retenção de talentos;</li>
                  <li>Motivação dos funcionários;</li>
                  <li>Não constitui base de incidência de contribuição previdenciária ou FGTS;</li>
                <ul>
              </div>
            </div>
          </div>
          <div class="col">
            <div class="box">
              <div class="image-wrapper">
                <img src="<?php echo get_template_directory_uri() ?>/assets/img/beneficios02.jpg" />
              </div>

              <div class="text">
                <h2>Para o Brasil</h2>
                <ul>
                  <li>Democratização de acesso à cultura;</li>
                  <li>Valorização da cultura nacional;</li>
                  <li>Desenvolvimento econômico do setor cultural;</li>
                  <li>Geração de emprego e renda;</li>
                <ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

<!--     <section class="pt-5 pb-5" id="depoimentos">
      <div class="container">
        <h2 class="section-title mb-5 text-center">Depoimentos</h2>
        <div class="row">
          <div class="overflow-wrapper">
              <div class="col-lg-4 mb-5">
                <div class="highlight-box" style="background-image: url('<?php echo get_template_directory_uri() ?>/assets/img/depoimentos.jpg')">
                  <div class="box-body">
                    <span class="cat">Lorem Ipsum</span>
                    <h3 class="box-title">
                      <a href="#this">Dolor sit amet</a>
                    </h3>
                  </div>
                </div>
              </div>
              <div class="col-lg-4 mb-5">
                <div class="highlight-box" style="background-image: url('<?php echo get_template_directory_uri() ?>/assets/img/depoimentos.jpg')">
                  <div class="box-body">
                    <span class="cat">Lorem Ipsum</span>
                    <h3 class="box-title">
                      <a href="#this">Dolor sit amet</a>
                    </h3>
                  </div>
                </div>
              </div>
              <div class="col-lg-4 mb-5">
                <div class="highlight-box" style="background-image: url('<?php echo get_template_directory_uri() ?>/assets/img/depoimentos.jpg')">
                  <div class="box-body">
                    <span class="cat">Lorem Ipsum</span>
                    <h3 class="box-title">
                      <a href="#this">Dolor sit amet</a>
                    </h3>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </section> -->

    <section class="pt-5 pb-5" id="saiba-mais">
      <div class="container">
        <h2 class="section-title mb-5 text-center">Saiba Mais</h2>
        <div class="row">
          <div class="overflow-wrapper">
            <div class="col">
              <a href="http://antigo.cultura.gov.br/por-dentro-do-vale-cultura1/-/asset_publisher/cOdwpc5nCipt/content/para-a-empresa-beneficiaria/10895?redirect=http%3A%2F%2Fantigo.cultura.gov.br%2Fpor-dentro-do-vale-cultura1%3Fp_p_id%3D101_INSTANCE_cOdwpc5nCipt%26p_p_lifecycle%3D0%26p_p_state%3Dnormal%26p_p_mode%3Dview%26p_p_col_id%3Dcolumn-1%26p_p_col_count%3D1" target="_blank">
                <div class="highlight-box" style="background-image: url('<?php echo get_template_directory_uri() ?>/assets/img/6_para_beneficiarios-01.jpg')">
                  <div class="box-body">
                    <h3 class="box-title"><span class="cat">Para a</span> Beneficiária</h3>
                  </div>
                </div>
              </a>
            </div>

            <div class="col">
              <a href="http://antigo.cultura.gov.br/por-dentro-do-vale-cultura1/-/asset_publisher/cOdwpc5nCipt/content/para-empresas-recebedoras/10895?redirect=http%3A%2F%2Fantigo.cultura.gov.br%2Fpor-dentro-do-vale-cultura1%3Fp_p_id%3D101_INSTANCE_cOdwpc5nCipt%26p_p_lifecycle%3D0%26p_p_state%3Dnormal%26p_p_mode%3Dview%26p_p_col_id%3Dcolumn-1%26p_p_col_count%3D1" target="_blank">
                <div class="highlight-box" style="background-image: url('<?php echo get_template_directory_uri() ?>/assets/img/6_para_estabelecimento_comercial.jpg')">
                  <div class="box-body">
                    <h3 class="box-title"><span class="cat">Para o</span> Estabelecimento</h3>
                  </div>
                </div>
              </a>
            </div>

            <div class="col">
              <a href="http://antigo.cultura.gov.br/por-dentro-do-vale-cultura1/-/asset_publisher/cOdwpc5nCipt/content/para-o-trabalhador/10895?redirect=http%3A%2F%2Fantigo.cultura.gov.br%2Fpor-dentro-do-vale-cultura1%3Fp_p_id%3D101_INSTANCE_cOdwpc5nCipt%26p_p_lifecycle%3D0%26p_p_state%3Dnormal%26p_p_mode%3Dview%26p_p_col_id%3Dcolumn-1%26p_p_col_count%3D1" target="_blank">
                <div class="highlight-box" style="background-image: url('<?php echo get_template_directory_uri() ?>/assets/img/5_trabalhador.jpg')">
                  <div class="box-body">
                    <h3 class="box-title"><span class="cat">Para o</span> Trabalhador</h3>
                  </div>
                </div>
              </a>
            </div>

            <div class="col">
              <a href="http://antigo.cultura.gov.br/por-dentro-do-vale-cultura1/-/asset_publisher/cOdwpc5nCipt/content/para-as-operadoras/10895?redirect=http%3A%2F%2Fantigo.cultura.gov.br%2Fpor-dentro-do-vale-cultura1%3Fp_p_id%3D101_INSTANCE_cOdwpc5nCipt%26p_p_lifecycle%3D0%26p_p_state%3Dnormal%26p_p_mode%3Dview%26p_p_col_id%3Dcolumn-1%26p_p_col_count%3D1" target="_blank">
                <div class="highlight-box" style="background-image: url('<?php echo get_template_directory_uri() ?>/assets/img/6_para_operadoras.jpg')">
                  <div class="box-body">
                    <h3 class="box-title"><span class="cat">Para a</span> Operadora</h3>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="pt-5 pb-5 bg-grey-2" id="perguntas-frequentes">
      <div class="container">
        <h2 class="section-title mb-5 text-center">Perguntas Frequentes</h2>

        <div id="accordionExample" class="accordion">
          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-1" aria-expanded="false" aria-controls="collapse-1"><span>Por que o Vale-Cultura foi criado?</span></a></h3>
            </div>

            <div id="collapse-1" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>O acesso à cultura estimula a reflexão e a compreensão da realidade, além do respeito à diversidade, o reconhecimento da identidade e a plena cidadania. Tudo isso é uma melhoria na qualidade de vida de todos os brasileiros. O Vale-Cultura também fomenta o crescimento da produção cultural em todo o Brasil.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-2" aria-expanded="false" aria-controls="collapse-2"><span>O Vale-Cultura tem previsão de término?</span></a></h3>
            </div>

            <div id="collapse-2" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>Não. A Lei nº 12.761, de 26 de dezembro de 2012, que criou o Vale-Cultura, está em pleno vigor. O que findou em dezembro de 2016 foi o incentivo fiscal concedido às empresas tributadas no lucro real para fins de estímulo ao fornecimento do benefício a seus funcionários. Apesar de, até o momento, não ter havido a publicação da renovação desse incentivo fiscal, todas as empresas participantes do Programa de Cultura do Trabalhador, independente do seu regime de tributação, usufruem de diversos benefícios, como a isenção de encargos sociais e trabalhistas sobre o valor despendido a título do Vale-Cultura, por exemplo.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-3" aria-expanded="false" aria-controls="collapse-3"><span>Com a interrupção do incentivo fiscal, os trabalhadores podem continuar usando o cartão Vale-Cultura?</span></a></h3>
            </div>

            <div id="collapse-3" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>Sim. Os trabalhadores podem continuar a usufruir o crédito armazenado no cartão do Vale-Cultura para a compra de bens e serviços culturais. Assim como as empresas podem manter o benefício de R$ 50 mensais, valor pago sem incidência de encargos sociais e trabalhistas.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-4" aria-expanded="false" aria-controls="collapse-4"><span>Com a interrupção do incentivo fiscal, as empresas tributadas com base no lucro real podem continuar ofertando o benefício do Vale-Cultura aos seus funcionários?</span></a></h3>
            </div>

            <div id="collapse-4" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>Sim. Apenas não poderão deduzir o valor do benefício em até 1% no imposto de renda devido. No entanto, isso não impede que participem do programa e façam jus aos benefícios sociais e trabalhistas concedidos a todas as empresas.  Lembrando que a adesão e concessão do benefício é facultativa. </p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-5" aria-expanded="false" aria-controls="collapse-5"><span>Quem fornece o Vale-Cultura?</span></a></h3>
            </div>

            <div id="collapse-5" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>São as empresas empregadoras que fornecem este benefício aos seus empregados. Elas são chamadas de "empresas beneficiárias".</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-6" aria-expanded="false" aria-controls="collapse-6"><span>Quem aceita o Vale-Cultura como forma de pagamento?</span></a></h3>
            </div>

            <div id="collapse-6" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>O Vale-Cultura é aceito por uma rede de cerca de 40 mil empresas em todos os estados do país, inclusive lojas virtuais. Apenas empresas que comercializam produtos e serviços culturais podem se habilitar como recebedoras. Elas são chamadas de "empresas recebedoras". Caso tenha interesse em ser uma recebedora, acesse o campo “saiba mais – estabelecimento comercial”, na aba “como funciona” desta página.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-7" aria-expanded="false" aria-controls="collapse-7"><span>Como minha empresa pode receber o cartão Vale-Cultura como forma de pagamento?</span></a></h3>
            </div>

            <div id="collapse-7" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>Procure uma das Operadoras do Programa e solicite a habilitação de seu estabelecimento comercial. Confira <a href="http://vale.cultura.gov.br/" target="_blank">aqui</a> a lista de Operadoras que podem habilitar sua empresa.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-8" aria-expanded="false" aria-controls="collapse-8"><span>Como este dinheiro chega ao trabalhador?</span></a></h3>
            </div>

            <div id="collapse-8" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>O valor do Vale-Cultura é creditado por meio de cartão magnético pré-pago, emitido por uma operadora de cartão. O valor creditado não expira e é cumulativo.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-9" aria-expanded="false" aria-controls="collapse-9"><span>O Vale-Cultura é uma bolsa oferecida pelo Governo Federal?</span></a></h3>
            </div>

            <div id="collapse-9" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>Não. O Vale-Cultura é um benefício trabalhista, assim como o auxílio-alimentação ou o auxílio-transporte. São as empresas que arcam com a sua oferta para os seus empregados. Não se trata de uma bolsa, nem é o Governo que concede o Vale-Cultura.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-10" aria-expanded="false" aria-controls="collapse-10"><span>O que a empresa que concede o benefício ganha com o Vale-Cultura?</span></a></h3>
            </div>

            <div id="collapse-10" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>Incentivar a vida cultural de seus trabalhadores é também colaborar para ressignificar o sentido do trabalho, reconhecendo a contribuição de cada indivíduo para o desenvolvimento da empresa e de todo o país. Ganha-se na satisfação e na motivação do funcionário, no poder de sua atuação, no relacionamento com o corpo funcional, na qualificação da equipe e no protagonismo de uma intervenção social importante para a sociedade brasileira. As empresas que fornecem o Vale-Cultura aos seus empregados, chamadas de "empresas beneficiárias", podem ainda usufruir de incentivos conferidos pelo Governo Federal. O valor despendido com o Vale-Cultura não constitui base de incidência de contribuição previdenciária ou do FGTS, não integra o salário de contribuição e é isento do imposto sobre a renda das pessoas físicas. Isso sem contar o benefício maior, de ver os resultados do investimento feito no seu empregado.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-11" aria-expanded="false" aria-controls="collapse-11"><span>Os servidores públicos podem ser beneficiados?</span></a></h3>
            </div>

            <div id="collapse-11" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>A legislação não veda a participação de servidores públicos, mas, para que eles tenham direito ao benefício, deve haver uma iniciativa de cada município, estado ou da União na adoção de medidas próprias. Basta que se inspirem no modelo do programa e aprovem uma legislação para regulamentar o seu próprio Vale-Cultura.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-12" aria-expanded="false" aria-controls="collapse-12"><span>O Vale-Cultura é extensivo aos aposentados pela Previdência Social?</span></a></h3>
            </div>

            <div id="collapse-12" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>Não. Neste caso, não é possível identificar vínculos trabalhistas diretos, de modo que não há o agente empregador que possa conceder o benefício, conforme formatação do programa.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-13" aria-expanded="false" aria-controls="collapse-13"><span>Os estudantes podem receber o Vale-Cultura?</span></a></h3>
            </div>

            <div id="collapse-13" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>Depende. Se o estudante tiver algum vínculo empregatício formal e se seu empregador tiver aderido ao programa e houver mútuo interesse, sim. No entanto, a concessão se dá pela relação de trabalho e não pelo fato de ser estudante.</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-14" aria-expanded="false" aria-controls="collapse-14"><span>Um trabalhador pode receber o Vale-Cultura sem que a empresa onde trabalhe tenha feito adesão junto à Secretaria Especial de Cultura?</span></a></h3>
            </div>

            <div id="collapse-14" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>Não. Para que o trabalhador possa receber o Vale-Cultura, é necessário que haja a adesão do empregador por meio de credenciamento junto à Secretaria Especial de Cultura. Peça à sua empresa!</p>
              </div>
            </div>
          </div>

          <div class="card">
            <div id="gabinete-container" class="card-header">
              <h3><a class="collapsed" href="#this" data-toggle="collapse" data-target="#collapse-15" aria-expanded="false" aria-controls="collapse-15"><span>O Microempreendedor Individual (MEI) pode receber o Vale-Cultura e também conceder o benefício ao seu empregado?</span></a></h3>
            </div>

            <div id="collapse-15" class="collapse" aria-labelledby="gabinete-container" data-parent="#accordionExample">
              <div class="card-body">
                <p>O MEI não recebe o benefício, mas poderá concedê-lo ao seu funcionário, assim entendido como o trabalhador que mantém vínculo empregatício com a empresa (no caso, a empresa é o próprio MEI).</p>
              </div>
            </div>
          </div>
        </div>


      </div>
    </section>
  </div>


</main>

<?php get_footer(); ?>


