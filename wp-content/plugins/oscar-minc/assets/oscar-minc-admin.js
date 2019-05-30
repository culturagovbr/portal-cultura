(function($) {
    $(document).ready(function() {
        oscarAdmin.init();
    });

    var oscarAdmin = {
        init: function() {
            // console.log('Admin scripts here!');
            $('#oscar_minc_deadline_time').mask('00/00/0000 00:00');
        }
    };
})(jQuery);