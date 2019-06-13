<?php /* Template Name: Filmes Indicados */ ?>

<?php get_header(); ?>

<main id="page-cnic" class="site-main">
  <div class="container">
    <div class="row">
      <?php the_breadcrumb(); ?>
    </div>

    <?php wp_reset_postdata(); ?>

  </div>

  <?php /*

  <?php if( have_rows('filmes_indicados') ): ?>

    <section class="timeline">
      <ul class="movies-list">
        <?php while( have_rows('filmes_indicados') ): the_row(); 
          $image = get_sub_field('imagem');
          $description = get_sub_field('descricao');
          $year = get_sub_field('ano');
        ?>

          <li class="movie">
            <div class="<?php echo ($image) ? 'has-image' : ''; ?>">
              <div class="align">

                <?php if ($image): ?>
                  <div class="image">
                    <img src="<?php echo $image['url']; ?>" />
                  </div>
                <?php endif; ?>

                <div class="text">
                  <time><?php echo $year; ?></time> <?php echo $description; ?>
                </div>
              </div>
            </div>
          </li>

        <?php endwhile; ?>
      </ul>
    </section>

  <?php endif; ?>

*/ ?>

  <section class="timeline">

    <ul class="movies-list">
      <li>
        <div class="box has-image">

          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-17.png" />
            </div>

            <div class="text">
              <time>1945</time> Quando a composição “Rio de Janeiro”, do brasileiro <a href="https://pt.wikipedia.org/wiki/Ary_Barroso" target="_blank">Ary Barroso</a>, disputou a estatueta de <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_can%C3%A7%C3%A3o_original" target="_blank">Melhor Canção Original</a> pelo filme norte-americano Brazil.
            </div>
          </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-18.png" />
            </div>

            <div class="text">
              <time>1960</time> O drama ítalo-franco-brasileiro Orfeu do Carnaval ou Orfeu Negro (na <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_can%C3%A7%C3%A3o_original" target="_blank">França</a>, Orphée Noir; na <a href="https://pt.wikipedia.org/wiki/It%C3%A1lia" target="_blank">Itália</a>, Orfeo Negro) venceu o <a href="https://pt.wikipedia.org/wiki/Oscar_de_Melhor_Filme_Estrangeiro" target="_blank">Oscar de Melhor Filme Estrangeiro</a>, mas representando a França, não o Brasil.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-19.png" />
            </div>

            <div class="text">
              <time>1963</time> O país teve seu próprio representante entre os melhores filmes estrangeiros do ano com <a href="https://pt.wikipedia.org/wiki/O_Pagador_de_Promessas" target="_blank">O Pagador de Promessas</a>. 
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-20.png" />
            </div>

            <div class="text">
              <time>1979</time> A coprodução brasileira <a href="https://pt.wikipedia.org/wiki/Raoni_(filme)" target="_blank">Raoni</a>, que mostra a vida do líder indígena brasileiro <a href="https://pt.wikipedia.org/wiki/Raoni_Metuktire" target="_blank">Raoni Metuktire</a>, disputou a categoria de <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_document%C3%A1rio_de_longa-metragem" target="_blank">Melhor Documentário</a>.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-22.png" />
            </div>

            <div class="text">
              <time>1982</time> <a href="https://pt.wikipedia.org/wiki/Tet%C3%AA_Vasconcellos" target="_blank">Tetê Vasconcellos</a> concorreu na categoria Documentário por seu trabalho em <a href="https://pt.wikipedia.org/wiki/El_Salvador:_Another_Vietnam" target="_blank">El Salvador: Another Vietnam</a>. 
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-23.png" />
            </div>

            <div class="text">
              <time>1986</time> A coprodução brasileira <a href="https://pt.wikipedia.org/wiki/O_Beijo_da_Mulher-Aranha" target="_blank">O Beijo da Mulher-Aranha</a> recebeu quatro indicações ao Oscar, incluindo <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_filme" target="_blank">Melhor Filme</a> e <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_diretor" target="_blank">Melhor Diretor</a> para o brasileiro naturalizado Hector Babenco.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-24.png" />
            </div>

            <div class="text">
              <time>1993</time> A brasileira <a href="https://pt.wikipedia.org/wiki/Luciana_Arrighi" target="_blank">Luciana Arrighi</a> consagrou-se vencedora do <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_dire%C3%A7%C3%A3o_de_arte" target="_blank">Oscar de Melhor Direção de Arte</a> pelo drama inglês <a href="https://pt.wikipedia.org/wiki/Howards_End_(filme)" target="_blank">Howards End</a>.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-25.png" />
            </div>

            <div class="text">
              <time>1996</time> <a href="https://pt.wikipedia.org/wiki/O_Quatrilho" target="_blank">O Quatrilho</a>,  concorreu para o Melhor Filme Estrangeiro.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-26.png" />
            </div>

            <div class="text">
              <time>1998</time> <a href="https://pt.wikipedia.org/wiki/O_Que_%C3%89_Isso,_Companheiro%3F_(filme)" target="_blank">O Que É Isso, Companheiro?</a> Concorreu para o Melhor Filme Estrangeiro.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-27.png" />
            </div>

            <div class="text">
              <time>1999</time> <a href="https://pt.wikipedia.org/wiki/Central_do_Brasil_(filme)" target="_blank">Central do Brasil</a>. Concorreu para o Melhor Filme Estrangeiro. Este último rendeu ainda uma indicação a <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_atriz" target="_blank">Melhor Atriz</a> para <a href="https://pt.wikipedia.org/wiki/Fernanda_Montenegro" target="_blank">Fernanda Montenegro</a>.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-28.png" />
            </div>

            <div class="text">
              <time>2001</time> Pela primeira vez o cinema brasileiro foi indicado ao Oscar de Melhor Curta-metragem em Live-action com <a href="https://pt.wikipedia.org/wiki/Uma_Hist%C3%B3ria_de_Futebol" target="_blank">Uma História de Futebol</a>.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-29.png" />
            </div>

            <div class="text">
              <time>2003</time> <a href="https://pt.wikipedia.org/wiki/Carlos_Saldanha" target="_blank">Carlos Saldanha</a> foi indicado por seu trabalho na animação norte-americana Ice Age. Saldanha, aliás, já dirigiu quatro filmes indicados ao Oscar (Ice Age, <a href="https://pt.wikipedia.org/wiki/Gone_Nutty" target="_blank">Gone Nutty</a>, <a href="https://pt.wikipedia.org/wiki/Rio_%28filme%29" target="_blank">Rio</a> e <a href="https://pt.wikipedia.org/wiki/Ferdinand_%28filme%29" target="_blank">Ferdinand</a>), sendo o brasileiro que mais marcou presença nos The Academy Awards.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-30.png" />
            </div>

            <div class="text">
              <time>2004</time> Gone Nutty dirigido por <a href="https://pt.wikipedia.org/wiki/Carlos_Saldanha" target="_blank">Carlos Saldanha</a>, foi indicado ao <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_curta_de_anima%C3%A7%C3%A3o" target="_blank">Oscar de Melhor Curta de Animação</a> em <a href="https://pt.wikipedia.org/wiki/2004" target="_blank">2004</a>.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-31.png" />
            </div>

            <div class="text">
              <time>2004</time> Uma surpresa: <a href="https://pt.wikipedia.org/wiki/Cidade_de_Deus_(filme)" target="_blank">Cidade de Deus</a>, ignorado como Melhor Filme Estrangeiro no ano anterior, recebeu quatro indicações nas categorias principais: <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_diretor" target="_blank">Melhor Diretor</a>, <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_roteiro_adaptado" target="_blank">Melhor Roteiro Adaptado</a>, <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_fotografia" target="_blank">Melhor Fotografia</a> e <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_edi%C3%A7%C3%A3o" target="_blank">Melhor Edição</a>.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-32.png" />
            </div>

            <div class="text">
              <time>2004</time> <a href="https://pt.wikipedia.org/wiki/Di%C3%A1rios_de_Motocicleta" target="_blank">Diários de Motocicleta</a> disputou dois Oscars, foi dirigido por <a href="https://pt.wikipedia.org/wiki/Walter_Salles" target="_blank">Walter Salles</a> (o mesmo responsável por Central do Brasil). Venceu na categoria de Melhor Canção, por Al otro lado del río, do compositor <a href="https://pt.wikipedia.org/wiki/Uruguai" target="_blank">uruguaio</a> <a href="https://pt.wikipedia.org/wiki/Jorge_Drexler" target="_blank">Jorge Drexler</a>. Foi também indicado na categoria de Melhor Roteiro Adaptado.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-33.png" />
            </div>

            <div class="text">
              <time>2011</time> Duas coproduções brasileiras não ficcionais, que narram a história de vida de artistas brasileiros, concorreram como Melhor Documentário: <a href="https://pt.wikipedia.org/wiki/Lixo_Extraordin%C3%A1rio" target="_blank">Lixo Extraordinário</a> (sobre o artista plástico paulista <a href="https://pt.wikipedia.org/wiki/Vik_Muniz" target="_blank">Vik Muniz</a>) concorreu em 2011, e <a href="https://pt.wikipedia.org/wiki/O_Sal_da_Terra" target="_blank">O Sal da Terra</a> (sobre o fotógrafo mineiro <a href="https://pt.wikipedia.org/wiki/Sebasti%C3%A3o_Salgado" target="_blank">Sebastião Salgado</a>), em 2015.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-34.png" />
            </div>

            <div class="text">
              <time>2012</time> Ice Age dirigido pelo brasileiro <a href="https://pt.wikipedia.org/wiki/Carlos_Saldanha" target="_blank">Carlos Saldanha</a>, recebeu uma indicação para “Melhor Canção Original“, com “Real in Rio”, cantada por <a href="https://pt.wikipedia.org/wiki/S%C3%A9rgio_Mendes" target="_blank">Sérgio Mendes</a> e <a href="https://pt.wikipedia.org/wiki/Carlinhos_Brown" target="_blank">Carlinhos Brown</a>.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-35.png" />
            </div>

            <div class="text">
              <time>2015</time> O Sal da Terra disputa na categoria Melhor Documentário. Ele é codirigido pelo brasileiro Juliano Salgado, filho do fotógrafo Sebastião Salgado, tema do filme. O alemão Wim Wenders também assina a direção desta coprodução Brasil, Itália e França.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-36.png" />
            </div>

            <div class="text">
              <time>2016</time> O Menino e o Mundo a <a href="https://pt.wikipedia.org/wiki/Academia_de_Artes_e_Ci%C3%AAncias_Cinematogr%C3%A1ficas" target="_blank">Academia de Artes e Ciências Cinematográficas</a> indicou o filme para a disputa na categoria <a href="https://pt.wikipedia.org/wiki/Oscar_de_melhor_filme_de_anima%C3%A7%C3%A3o" target="_blank">melhor animação</a>.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-37.png" />
            </div>

            <div class="text">
              <time>2018</time> O Touro Ferdinando, dirigido pelo brasileiro Carlos Saldanha, concorreu na categoria de melhor animação.
            </div>
        </div>
      </li>

      <li>
        <div class="box has-image">
          <div class="align">
            <div class="image">
              <img src="http://oscar.cultura.gov.br/wp-content/uploads/2018/06/image-38.png" />
            </div>

            <div class="text">
              <time>2018</time> Produzido pelo brasileiro Rodrigo Teixeira e dirigido por Luca Guadagnino, <a href="https://www.huffpostbrasil.com/news/me-chame-pelo-seu-nome/" target="_blank">Me Chame pelo Seu Nome</a> foi indicado ao Oscar de Melhor Filme, mas ficou com a estatueta de Melhor Roteiro Adaptado.
            </div>
        </div>
      </li>

    </ul>
  </section>

</main>

<?php get_footer(); ?>



