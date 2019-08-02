(function($) {
    $(document).ready(function() {
        oscarAdmin.init();
    });

    var oscarAdmin = {
        init: function() {
            // console.log('Admin scripts here!');
            $('#oscar_minc_deadline_time').mask('00/00/0000 00:00');
            $('#oscar_minc_schedule_time_1').mask('00/00/0000 00:00');
            $('#oscar_minc_schedule_time_2').mask('00/00/0000 00:00');
            $('#oscar_minc_schedule_time_3').mask('00/00/0000 00:00');
        }
    };
})(jQuery);