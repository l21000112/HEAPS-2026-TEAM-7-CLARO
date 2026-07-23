import type { ScenarioTranslationMap } from './types';

const ms: ScenarioTranslationMap = {
  call: {
    "1": {
      callerName: "DBS Bank",
      dialogue:
        "Ini DBS. Kami mengesan aktiviti mencurigakan dalam akaun bank anda, kemungkinan terlibat dalam kes pengubahan wang haram. Sila berikan butiran log masuk bank anda untuk mengesahkan identiti anda. Kegagalan berbuat demikian akan menyebabkan akaun anda digantung sementara sehingga notis lanjut.",
      declineReason:
        "Menamatkan panggilan adalah respons paling selamat dan berkesan terhadap panggilan yang mencurigakan. Dengan menamatkan perbualan serta-merta, anda memutuskan keupayaan penipu untuk memanipulasi anda menggunakan taktik tekanan tinggi.",
      declineReasonSimple:
        "Menamatkan panggilan adalah bijak. Mengakhiri panggilan menghalang penipu daripada menakut-nakutkan anda supaya memberikan butiran anda.",
      options: {
        "1": {
          text: "\"Saya tidak mahu akaun saya digantung, ID dan kata laluan akaun saya ialah...\"",
          reason:
            "Ingat bahawa penipu boleh memalsukan nama pemanggil mereka untuk kelihatan sah. Mereka juga bergantung pada ketakutan dengan memanfaatkan keinginan anda untuk menyelesaikan krisis palsu dengan cepat. Bank tidak akan sesekali meminta butiran log masuk peribadi atau maklumat anda melalui telefon.",
          reasonSimple:
            "Itu tidak selamat. Bank tidak akan sesekali meminta butiran log masuk anda melalui telefon. Penipu boleh memalsukan nama pemanggil untuk kelihatan sebenar.",
        },
        "2": {
          text: "\"Saya tidak selesa mendedahkan butiran log masuk saya, tetapi anda boleh menghantar SMS OTP untuk mengesahkan identiti saya.\"",
          reason:
            "Ingat bahawa penipu boleh memalsukan nama pemanggil mereka untuk kelihatan sah. Ini perangkap berbahaya! Jika anda bersetuju dengan OTP, penipu akan mencetuskan tetapan semula kata laluan sebenar atau pemindahan wang di pihak mereka, meminta anda membaca kod itu untuk 'mengesahkan' diri anda, kemudian menggunakannya untuk mengosongkan akaun anda.",
          reasonSimple:
            "Jangan sesekali kongsi kod SMS. Penipu boleh menggunakan kod itu untuk mengambil wang daripada akaun anda.",
        },
        "3": {
          text: "\"Saya akan menamatkan panggilan sekarang.\"",
          reason:
            "Menamatkan panggilan adalah respons paling selamat dan berkesan terhadap panggilan yang mencurigakan. Dengan menamatkan perbualan serta-merta, anda memutuskan keupayaan penipu untuk memanipulasi anda menggunakan taktik tekanan tinggi.",
          reasonSimple: "Bagus, anda menamatkan panggilan. Ia menghalang penipu daripada memberi tekanan kepada anda.",
        },
      },
    },
    "2": {
      callerName: "Pemanggil Tidak Dikenali",
      dialogue:
        "Selamat petang, nama saya Sarah daripada pasukan Pencegahan Penipuan DBS. Kami mengesan transaksi luar biasa sebanyak $400 pada kad Visa anda hari ini. Untuk mengesahkan identiti anda dengan selamat dan menyemak transaksi ini, saya baru sahaja menghantar pemberitahuan selamat ke aplikasi DBS digibank berdaftar anda. Sila buka aplikasi anda sekarang untuk menyemak dan membenarkan atau menolak transaksi tersebut. Saya akan terus berada di talian.",
      declineReason:
        "Jangan sesekali menganggap bahawa semua Pemanggil Tidak Dikenali adalah penipu. Adalah baik untuk berwaspada, tetapi mengabaikan mereka sepenuhnya boleh menyebabkan anda terlepas kecemasan atau penghantaran penting. Jawab dengan berhati-hati, tetapi bersedia untuk menamatkan panggilan apabila mereka meminta wang atau butiran peribadi.",
      declineReasonSimple:
        "Tidak setiap panggilan tidak dikenali adalah penipuan. Jawab dengan berhati-hati, tetapi tutup jika mereka meminta wang atau butiran peribadi.",
      options: {
        "1": {
          text: "\"Baiklah, saya akan menyemak pemberitahuan sekarang.\"",
          reason:
            "Betul! Bergantung pada pemberitahuan tolak dalam aplikasi adalah cara tersah dan selamat untuk mengesahkan transaksi. Oleh kerana penipu tidak boleh mencetuskan pemberitahuan di dalam aplikasi bank rasmi anda, ini adalah cara yang selamat untuk diteruskan.",
          reasonSimple:
            "Pilihan yang baik. Menyemak aplikasi bank sendiri adalah cara yang selamat untuk memastikan pembayaran adalah sebenar.",
        },
        "2": {
          text: "\"Jika anda benar-benar dari DBS, beritahu saya 4 nombor pertama NRIC saya untuk membuktikannya.\"",
          reason:
            "Kerajaan Singapura sedang menghentikan penggunaan nombor NRIC penuh/separa untuk pengesahan kerana ia tidak boleh dipercayai dan ramai orang boleh berkongsi gabungan separa yang sama.",
          reasonSimple:
            "Nombor NRIC bukan cara yang selamat untuk membuktikan identiti seseorang. Jangan gunakannya seperti kata laluan.",
        },
        "3": {
          text: "\"Saya tidak memasang aplikasi itu, tetapi jika anda bertanyakan soalan peribadi, saya boleh mengesahkannya secara lisan.\"",
          reason:
            "Jangan sesekali menawarkan untuk memintas protokol selamat; anda tidak sepatutnya mendedahkan maklumat peribadi melalui panggilan tanpa dijemput.",
          reasonSimple:
            "Jangan kongsi butiran peribadi pada panggilan tanpa dijemput. Teruskan dengan semakan aplikasi bank yang selamat.",
        },
      },
    },
    "3": {
      callerName: "Ibu",
      dialogue:
        "Hei, hanya mahu memberitahu bahawa Nenek akan datang untuk Makan Malam malam ini!",
      declineReason:
        "Itu panggilan sebenar dari Ibu anda, kenapa anda menamatkan panggilan tanpa membalasnya...",
      declineReasonSimple:
        "Itu panggilan sebenar dari Ibu. Tidak setiap panggilan adalah penipuan.",
      options: {
        "1": {
          text: "\"Baiklah, terima kasih!\"",
          reason:
            "Betul! Tiada tanda amaran di sini, hanya Ibu memberitahu anda tentang kedatangan Nenek lebih awal!",
          reasonSimple:
            "Bagus. Ini panggilan biasa dari Ibu tanpa apa-apa yang menakutkan atau menipu.",
        },
      },
    },
    "4": {
      callerName: "Pulse Advertising",
      dialogue:
        "Helo, saya menelefon dari jabatan HR sebuah rangkaian pengiklanan global. Kami telah menyemak profil anda di LinkedIn dan sangat terkesan dengan kepakaran anda dalam pelbagai bidang. Kami ingin menawarkan jawatan segera yang sepenuhnya jarak jauh. Untuk mendapatkan jawatan ini dan memudahkan semakan latar belakang anda, kami hanya memerlukan anda memindahkan yuran onboarding penuh boleh dikembalikan sebanyak $200 melalui PayNow ke +65 98765432.",
      declineReason:
        "Penipu sering menggunakan butiran pujian yang sangat khusus terdapat dalam talian tentang kemahiran teknikal anda untuk membina kepercayaan palsu. Menamatkan panggilan serta-merta adalah tindakan paling selamat.",
      declineReasonSimple:
        "Menamatkan panggilan adalah betul. Tawaran kerja palsu cuba memuji anda, kemudian meminta wang. Itu penipuan.",
      options: {
        "1": {
          text: "Bagus sekali! Saya percaya saya pernah dengar tentang syarikat anda dan tidak sabar untuk menyertai pasukan! Saya akan memindahkan yuran itu secepat mungkin.",
          reason:
            "Majikan sah tidak akan sesekali meminta calon membayar yuran pendahuluan untuk onboarding, semakan latar belakang, atau peralatan. Ini ciri klasik penipuan pekerjaan!",
          reasonSimple:
            "Kerja sebenar tidak akan sesekali meminta anda membayar wang lebih dahulu. Meminta yuran adalah amaran besar penipuan.",
        },
        "2": {
          text: "Ini jelas penipuan jadi saya akan menamatkan panggilan.",
          reason:
            "Penipu sering menggunakan butiran pujian yang sangat khusus terdapat dalam talian tentang kemahiran teknikal anda untuk membina kepercayaan palsu. Menamatkan panggilan serta-merta adalah tindakan paling selamat.",
          reasonSimple:
            "Bagus, anda menamatkan panggilan. Panggilan kerja palsu cuba memuji anda, kemudian meminta wang.",
        },
        "3": {
          text: "Saya berminat dengan jawatan ini tetapi boleh kita tolak yuran itu daripada gaji pertama saya sahaja?",
          reason:
            "Berkira dengan penipu membuatkan anda terus terlibat dan terdedah. Pengambil pekerja sebenar mengikut proses temuduga formal dan tidak akan sesekali 'menggaji' anda serta-merta melalui panggilan telefon tanpa dijemput.",
          reasonSimple:
            "Jangan terus bercakap tentang yuran dengan orang yang tidak dikenali. Kerja sebenar menggunakan temuduga yang betul, bukan tawaran kerja mengejut melalui telefon.",
        },
      },
    },
    "5": {
      callerName: "Pasukan Polis Singapura",
      dialogue:
        "Ini Inspektor Chen dari Pasukan Polis Singapura. Identiti anda digunakan dalam kes pengubahan wang haram. Anda mesti memindahkan $5,000 ke akaun negeri selamat ini serta-merta untuk siasatan, atau waran akan dikeluarkan untuk tangkapan anda.",
      declineReason:
        "Menamatkan panggilan adalah respons terbaik. Pegawai penguatkuasa undang-undang sebenar tidak akan sesekali menelefon untuk menuntut wang atau meminta butiran bank anda untuk membersihkan nama anda.",
      declineReasonSimple:
        "Menamatkan panggilan adalah betul. Polis sebenar tidak akan sesekali menelefon untuk meminta wang atau butiran bank anda.",
      options: {
        "1": {
          text: "\"Saya akan memindahkan wang itu sekarang, sila jangan tangkap saya.\"",
          reason:
            "Ketakutan adalah taktik biasa. Polis tidak akan sesekali meminta anda memindahkan wang ke 'akaun negeri selamat' melalui telefon.",
          reasonSimple:
            "Penipu cuba menakut-nakutkan anda. Polis tidak akan sesekali meminta anda menghantar wang melalui telefon.",
        },
        "2": {
          text: "\"Boleh saya turun ke balai polis untuk menyelesaikan perkara ini?\"",
          reason:
            "Walaupun lebih baik daripada membayar, kekal di talian membenarkan penipu mengancam atau memanipulasi anda lagi. Tindakan paling selamat adalah menamatkan panggilan.",
          reasonSimple:
            "Jangan terus bercakap dengan mereka. Mereka akan cuba menipu anda. Sahaja menamatkan panggilan.",
        },
        "3": {
          text: "\"Saya akan menamatkan panggilan sekarang.\"",
          reason:
            "Menamatkan panggilan memutuskan keupayaan mereka untuk memberi tekanan kepada anda. Jika anda bimbang, anda boleh menghubungi hotline polis rasmi sendiri.",
          reasonSimple:
            "Bagus. Menamatkan panggilan menghalang mereka daripada menakut-nakutkan anda. Anda sentiasa boleh menghubungi nombor polis sebenar sendiri.",
        },
      },
    },
    "6": {
      callerName: "Penghantaran SingPost",
      dialogue:
        "Helo, ini mesej automatik dari SingPost. Parcel antarabangsa anda tidak dapat dihantar kerana duti kastam belum dibayar sebanyak $3.50. Tekan 1 untuk bercakap dengan ejen dan membayar dengan kad kredit, atau parcel anda akan dimusnahkan.",
      declineReason:
        "Menamatkan panggilan melindungi maklumat anda. Penipu sering berpura-pura menahan parcel untuk mencuri butiran kad kredit anda atau mengenakan yuran kastam palsu.",
      declineReasonSimple:
        "Menamatkan panggilan adalah bijak. Penipu berdusta tentang bungkusan hilang untuk mencuri butiran kad anda.",
      options: {
        "1": {
          text: "\"Saya akan tekan 1 dan bayar $3.50 supaya saya dapat bungkusan saya.\"",
          reason:
            "Ini penipuan pancingan. Yuran kecil itu adalah muslihat untuk membuat anda menaip butiran kad kredit ke dalam sistem palsu, yang akan digunakan untuk mencuri lebih banyak wang.",
          reasonSimple:
            "Ini muslihat. Yuran kecil itu hanya alasan untuk mencuri nombor kad kredit anda.",
        },
        "2": {
          text: "\"Saya akan menamatkan panggilan.\"",
          reason:
            "Menamatkan panggilan adalah pilihan yang betul. Jika anda menjangkakan parcel, sentiasa semak aplikasi atau laman web penjejakan rasmi, bukan panggilan telefon rawak.",
          reasonSimple:
            "Pilihan yang bagus. Jika anda menjangkakan bungkusan, semak aplikasi penghantaran sebenar, bukan panggilan rawak.",
        },
      },
    },
    "7": {
      callerName: "Kurier Shopee",
      dialogue:
        "Hai, saya kurier yang menghantar parcel Shopee anda. Saya berada di blok anda tetapi tidak menjumpai lif lobbi. Boleh anda bantu tunjukkan jalan?",
      declineReason:
        "Mengabaikan nombor tidak dikenali sepenuhnya bermakna anda mungkin terlepas pemandu penghantaran sebenar yang cuba mencari alamat anda.",
      declineReasonSimple:
        "Anda mungkin terlepas penghantaran sebenar. Tidak mengapa untuk menjawab, jangan berikan mereka wang atau kata laluan.",
      options: {
        "1": {
          text: "\"Baiklah, hanya berjalan melintasi taman permainan dan anda akan nampak Lobbi B.\"",
          reason:
            "Ini panggilan penghantaran biasa. Membantu mereka mencari lokasi adalah selamat, asalkan mereka tidak meminta bayaran atau maklumat sensitif.",
          reasonSimple:
            "Ini panggilan biasa. Membantu pemandu mencari rumah anda untuk menghantar parcel adalah selamat.",
        },
        "2": {
          text: "\"Anda berbohong! Jika tidak, beritahu saya nombor NRIC penuh saya.\"",
          reason:
            "Pemandu penghantaran tidak mempunyai nombor NRIC anda. Membuat tuntutan yang tidak munasabah untuk pengesahan boleh menghalang anda daripada menerima barang anda.",
          reasonSimple:
            "Pemandu penghantaran tidak tahu nombor peribadi anda. Memintanya daripada mereka hanya akan melambatkan bungkusan anda.",
        },
      },
    },
    "8": {
      callerName: "Sokongan Teknikal Singtel",
      dialogue:
        "Selamat pagi, saya menelefon dari sokongan teknikal Singtel. Kami mengesan bahawa Wi-Fi rumah anda telah diretas. Untuk membetulkannya, sila muat turun aplikasi 'TeamViewer' pada telefon anda supaya saya dapat mengamankan rangkaian anda.",
      declineReason:
        "Menamatkan panggilan menghentikan penipuan. Penipu sokongan teknikal cuba memperdayakan anda memuat turun perisian yang membolehkan mereka mengawal telefon atau komputer anda.",
      declineReasonSimple:
        "Menamatkan panggilan adalah baik. Sokongan teknikal palsu cuba memperdayakan anda memberikan mereka kawalan ke atas telefon anda.",
      options: {
        "1": {
          text: "\"Baiklah, saya memuat turun aplikasi itu sekarang untuk membantu anda membetulkan Wi-Fi saya.\"",
          reason:
            "Jangan sesekali muat turun aplikasi akses jauh seperti TeamViewer atau AnyDesk pada panggilan tanpa dijemput. Penipu menggunakannya untuk mengawal peranti anda dan log masuk ke akaun bank anda.",
          reasonSimple:
            "Jangan sesekali muat turun aplikasi kerana orang yang tidak dikenali memintanya. Mereka boleh menggunakan aplikasi itu untuk mengawal telefon anda dan mencuri wang.",
        },
        "2": {
          text: "\"Saya akan menamatkan panggilan sekarang.\"",
          reason:
            "Menamatkan panggilan adalah langkah paling selamat. Syarikat telekomunikasi tidak akan menelefon anda secara mengejut untuk menuntut anda memasang perisian kawalan jauh.",
          reasonSimple:
            "Bagus. Syarikat internet sebenar tidak akan menelefon anda untuk memuat turun aplikasi kawalan jauh.",
        },
      },
    },
    "9": {
      callerName: "+65 8123 4567",
      dialogue:
        "Hei! Lama tak jumpa. Anda ingat siapa saya? Saya baru tukar nombor, simpan nombor ini!",
      declineReason:
        "Menamatkan panggilan adalah langkah yang betul. Penipuan 'teka siapa' bergantung pada anda memberikan mereka nama yang boleh dicuri untuk menipu anda.",
      declineReasonSimple:
        "Menamatkan panggilan adalah bijak. Penipu mahu anda meneka nama mereka supaya mereka boleh berpura-pura menjadi rakan anda untuk memudahkan menipu anda.",
      options: {
        "1": {
          text: "\"Adakah ini Pak Cik David?\"",
          reason:
            "Jika anda meneka nama, penipu akan terus bersetuju dan berpura-pura menjadi orang itu. Mereka kemudian biasanya akan meminta pinjaman mendesak beberapa hari kemudian.",
          reasonSimple:
            "Jangan meneka nama. Jika anda meneka nama, penipu akan berpura-pura menjadi orang itu dan meminta wang kemudian.",
        },
        "2": {
          text: "\"Saya tidak mengenali suara anda. Saya akan menamatkan panggilan.\"",
          reason:
            "Jika mereka enggan mengenalkan diri, kemungkinan besar ia penipuan 'rakan palsu'. Menamatkan panggilan adalah pertahanan terbaik.",
          reasonSimple:
            "Bagus. Jika mereka tidak mahu memberitahu nama, mereka cuba menipu anda. Menamatkan panggilan adalah selamat.",
        },
      },
    },
    "10": {
      callerName: "Klinik Pergigian Smile",
      dialogue:
        "Hai {{name}}, ini Smile Dental. Hanya mahu mengingatkan anda tentang temujanji pergigian anda esok pukul 10 pagi. Adakah anda dapat hadir?",
      declineReason:
        "Menamatkan panggilan ke klinik anda mungkin bermakna terlepas kemas kini penting tentang temujanji anda.",
      declineReasonSimple:
        "Anda mungkin terlepas pengingat anda. Tidak mengapa untuk bercakap dengan klinik anda tentang lawatan anda.",
      options: {
        "1": {
          text: "\"Ya, saya akan hadir. Terima kasih!\"",
          reason:
            "Ini panggilan pentadbiran biasa. Mengesahkan kehadiran tidak memerlukan berkongsi maklumat sensitif.",
          reasonSimple:
            "Ini panggilan biasa. Selamat untuk mengatakan ya tanpa berkongsi maklumat sensitif.",
        },
      },
    },
    "11": {
      callerName: "Lembaga CPF",
      dialogue:
        "Ini panggilan mendesak dari Lembaga CPF. Akaun persaraan anda telah dikunci kerana percubaan log masuk mencurigakan. Sila berikan kata laluan Singpass anda supaya kami boleh mengesahkan identiti anda dan membuka kunci dana anda.",
      declineReason:
        "Menamatkan panggilan melindungi dana persaraan anda. Penipu memalsukan nombor kerajaan untuk menakut-nakutkan anda menyerahkan butiran Singpass anda.",
      declineReasonSimple:
        "Menamatkan panggilan adalah betul. Penipu memalsukan nama kerajaan untuk mencuri kata laluan anda.",
      options: {
        "1": {
          text: "\"Saya tidak mahu akaun saya dikunci, kata laluan saya ialah...\"",
          reason:
            "Kata laluan Singpass anda adalah kunci kepada semua data kerajaan dan perkhidmatan kewangan anda. Tiada agensi sah yang akan sesekali memintanya melalui telefon.",
          reasonSimple:
            "Jangan sesekali beritahu sesiapa kata laluan anda melalui telefon. Pekerja kerajaan sebenar tidak akan sesekali memintanya.",
        },
        "2": {
          text: "\"Saya akan menamatkan panggilan. Saya akan menyemak aplikasi CPF saya sendiri.\"",
          reason:
            "Cemerlang! Mengesahkan status melalui aplikasi atau laman web rasmi adalah cara yang betul dan selamat untuk mengendalikan amaran.",
          reasonSimple:
            "Pilihan yang bagus. Menyemak aplikasi sebenar sendiri adalah cara paling selamat untuk melihat jika ada masalah.",
        },
      },
    },
    "12": {
      callerName: "Pusat Cabutan Bertuah",
      dialogue:
        "Tahniah! Nombor telefon anda telah dipilih untuk memenangi $10,000 dalam cabutan bertuah tahunan kami! Untuk memproses kemenangan anda, anda hanya perlu membayar cukai pentadbiran kecil sebanyak $150 melalui pemindahan bank.",
      declineReason:
        "Menamatkan panggilan menghalang anda daripada membayar cukai palsu ke atas hadiah yang tidak wujud.",
      declineReasonSimple:
        "Menamatkan panggilan adalah bijak. Panggilan hadiah palsu hanya mahu mencuri wang anda.",
      options: {
        "1": {
          text: "\"Wow, $10,000! Saya akan memindahkan $150 sekarang.\"",
          reason:
            "Ini penipuan bayaran pendahuluan klasik. Jika anda perlu membayar wang untuk menuntut hadiah, ia bukan hadiah sebenar.",
          reasonSimple:
            "Hadiah sebenar adalah percuma. Jika anda perlu membayar wang untuk mendapatkan hadiah, ia penipuan.",
        },
        "2": {
          text: "\"Saya tidak menyertai cabutan bertuah. Saya akan menamatkan panggilan.\"",
          reason:
            "Menamatkan panggilan adalah respons yang betul. Anda tidak boleh memenangi loteri atau cabutan yang anda tidak sertai.",
          reasonSimple:
            "Bagus. Anda tidak boleh memenangi permainan yang anda tidak main. Menamatkan panggilan adalah pilihan terbaik.",
        },
      },
    },
    "13": {
      callerName: "Penghantaran Foodpanda",
      dialogue:
        "Hai, saya ada pesanan makanan anda tetapi pengawal keselamatan di pintu pagar memerlukan anda membenarkan kemasukan saya. Boleh anda panggil pondok pengawal?",
      declineReason:
        "Menamatkan panggilan kepada pemandu penghantaran makanan anda bermakna makanan anda mungkin menjadi sejuk atau hilang!",
      declineReasonSimple:
        "Anda mungkin kehilangan makanan anda. Tidak mengapa untuk membantu pemandu menjumpai pintu anda.",
      options: {
        "1": {
          text: "\"Baiklah, saya akan panggil pondok pengawal untuk membenarkan anda masuk.\"",
          reason:
            "Ini prosedur biasa bagi banyak kondominium. Adalah selamat untuk membenarkan penghantaran yang sah.",
          reasonSimple:
            "Ini panggilan biasa. Memaklumkan pengawal untuk membenarkan makanan anda masuk adalah selamat.",
        },
        "2": {
          text: "\"Biarkan sahaja di pintu pagar, saya tidak mempercayai anda.\"",
          reason:
            "Terlalu curiga di sini hanya akan mengakibatkan pengalaman penghantaran yang buruk. Penghantar tidak meminta data sensitif, hanya akses.",
          reasonSimple:
            "Anda tidak perlu takut. Pemandu hanya mahu memberikan makanan anda, bukan mencuri rahsia anda.",
        },
      },
    },
    "14": {
      callerName: "Nombor Tidak Dikenali",
      dialogue:
        "[Bunyi menangis] Kami ada anak anda. Pindahkan $50,000 ke akaun ini atau anda tidak akan melihat mereka lagi. Jangan tamatkan panggilan atau hubungi polis jika tidak!",
      declineReason:
        "Menamatkan panggilan adalah menakutkan dalam senario ini, tetapi ia menghalang anda daripada dimanipulasi oleh penipu yang menggunakan jeritan palsu untuk mensimulasikan penculikan.",
      declineReasonSimple:
        "Menamatkan panggilan menakutkan tetapi bijak. Penipu menggunakan bunyi menangis palsu untuk memperdayakan anda membayar mereka.",
      options: {
        "1": {
          text: "\"Tolong jangan sakitkan mereka! Saya akan hantar wang itu!\"",
          reason:
            "Penipu memangsa kepanikan. Tangisan itu biasanya rakaman atau pelakon. Membayar mereka tidak menjamin apa-apa dan hanya menggandakan penipu.",
          reasonSimple:
            "Penipu menggunakan tangisan palsu untuk menakut-nakutkan anda. Menghantar wang kepada orang yang tidak dikenali tidak selamat.",
        },
        "2": {
          text: "\"Saya akan menamatkan panggilan dan menghubungi anak saya terus untuk memastikan keadaan mereka.\"",
          reason:
            "Ini langkah yang betul. Tamatkan panggilan serta-merta dan hubungi nombor sebenar orang yang disayangi. 99% masa, mereka selamat sepenuhnya di sekolah atau tempat kerja.",
          reasonSimple:
            "Pilihan yang bagus. Tamatkan panggilan dan hubungi keluarga anda sendiri untuk memastikan mereka selamat.",
        },
      },
    },
    "15": {
      callerName: "Kajian Kementerian Kesihatan",
      dialogue:
        "Helo, saya menelefon dari Kementerian Kesihatan untuk kajian kesihatan ringkas. Jika anda melengkapkannya, kami akan menghantar baucar NTUC $20 kepada anda. Kami hanya memerlukan NRIC penuh, alamat rumah dan nombor akaun bank anda untuk menyerahkan ganjaran.",
      declineReason:
        "Menamatkan panggilan menghalang penipu daripada mengeluarkan maklumat peribadi di bawah nama kajian rasmi.",
      declineReasonSimple:
        "Menamatkan panggilan adalah baik. Penipu memalsukan kajian untuk meminta butiran peribadi anda.",
      options: {
        "1": {
          text: "\"Baiklah saya akan sertai kajian, NRIC, alamat rumah dan butiran bank saya ialah...\"",
          reason:
            "Kajian sebenar tidak memerlukan maklumat sangat sensitif seperti nombor akaun bank anda. 'Ganjaran' itu adalah umpan untuk mencuri identiti anda.",
          reasonSimple:
            "Kajian sebenar tidak meminta nombor bank anda. Hadiah percuma itu adalah muslihat untuk mencuri rahsia anda.",
        },
        "2": {
          text: "\"Saya tidak memberikan butiran saya melalui telefon. Selamat tinggal.\"",
          reason:
            "Menamatkan panggilan adalah pertahanan terbaik. Jangan sesekali menukar maklumat peribadi anda dengan ganjaran kecil pada panggilan tanpa dijemput.",
          reasonSimple:
            "Bagus. Jangan sesekali tukar butiran peribadi anda dengan hadiah kecil melalui telefon.",
        },
      },
    },
    "16": {
      callerName: "Rakan Sejawat John",
      dialogue:
        "Hei {{name}}, ini John dari pemasaran. Pelanggan mahu tukar warna pembentangan kepada biru. Boleh anda kemas kini slaid sebelum mesyuarat pukul 3 petang?",
      declineReason:
        "Menamatkan panggilan kepada rakan sejawat mungkin menyebabkan kelewatan dalam projek kerja anda.",
      declineReasonSimple:
        "Anda mungkin terlepas berita kerja. Tidak mengapa untuk bercakap dengan orang yang anda bekerjasama.",
      options: {
        "1": {
          text: "\"Baiklah, saya akan kemas kini slaid sekarang.\"",
          reason:
            "Ini interaksi tempat kerja biasa dengan kenalan yang dikenali. Tiada data peribadi sensitif diminta.",
          reasonSimple:
            "Ini panggilan kerja biasa. Membantu rakan dari kerja adalah selamat.",
        },
      },
    },
    "17": {
      callerName: "Pejabat Cukai IRAS",
      dialogue:
        "Selamat petang. Ini Lembaga Hasil Dalam Negeri Singapura. Anda telah membayar lebih cukai dan berhak mendapat bayaran balik $450. Saya menghantar pautan ke telefon anda sekarang. Sila klik dan log masuk ke bank anda untuk menuntut bayaran balik.",
      declineReason:
        "Menamatkan panggilan mengelakkan perangkap bayaran balik palsu, yang direka untuk mencuri kelayakan bank anda.",
      declineReasonSimple:
        "Menamatkan panggilan adalah betul. Penipu menggunakan bayaran balik palsu untuk memperdayakan anda berkongsi kata laluan bank.",
      options: {
        "1": {
          text: "\"Terima kasih, saya akan klik pautan dan log masuk sekarang.\"",
          reason:
            "IRAS tidak menghantar pautan SMS meminta anda log masuk ke bank anda. Pautan berniat jahat itu adalah laman pancingan data yang direka untuk kelihatan seperti bank anda bagi mencuri butiran log masuk anda.",
          reasonSimple:
            "Kerajaan tidak akan sesekali menghantar pautan. Ini pautan penipuan dan akan membawa anda ke laman palsu yang mencuri kata laluan anda.",
        },
        "2": {
          text: "\"Saya akan menamatkan panggilan. Saya akan menyemak portal cukai saya terus.\"",
          reason:
            "Respons sempurna. Sentiasa layari portal kerajaan rasmi sendiri berbanding mengklik pautan atau mengikut arahan dari panggilan tanpa dijemput.",
          reasonSimple:
            "Pilihan yang bagus. Menyemak laman web kerajaan sebenar sendiri adalah cara selamat untuk melihat jika ia benar.",
        },
      },
    },
    "18": {
      callerName: "Pinjaman Tunai Pantas",
      dialogue:
        "Perlukan tunai dengan pantas? Kami menawarkan pinjaman 0% faedah istimewa hari ini sehingga $10,000. Kelulusan dalam 5 minit. Anda hanya perlu memindahkan yuran pemprosesan $500 lebih dahulu untuk menunjukkan komitmen anda.",
      declineReason:
        "Menamatkan panggilan menghalang anda daripada terjerat dengan pemberi pinjaman haram yang menggunakan taktik pemerasan.",
      declineReasonSimple:
        "Menamatkan panggilan adalah bijak. Pemanggil pinjaman haram akan memerangkap anda dan meminta lebih banyak wang.",
      options: {
        "1": {
          text: "\"Saya perlukan wang, saya akan memindahkan yuran itu.\"",
          reason:
            "Pemberi pinjaman sah menolak yuran daripada jumlah pinjaman; mereka tidak akan sesekali meminta anda membayar wang untuk meminjam wang. Ini penipuan pinjaman haram.",
          reasonSimple:
            "Bank sebenar tidak meminta anda membayar wang untuk meminjam wang. Ini muslihat.",
        },
        "2": {
          text: "\"Saya tidak perlukan pinjaman, selamat tinggal.\"",
          reason:
            "Menamatkan panggilan adalah satu-satunya pilihan selamat. Terlibat dengan pemberi pinjaman haram boleh membawa kepada gangguan teruk.",
          reasonSimple:
            "Bagus. Mengatakan tidak kepada panggilan pinjaman pelik menjaga anda selamat daripada orang jahat.",
        },
      },
    },
    "19": {
      callerName: "Klinik Veterinar Happy Paws",
      dialogue:
        "Hai {{name}}, ini Klinik Happy Paws. Anjing anda Buster perlu mendapat suntikan penggalak rabies tahunan beliau minggu depan. Adakah anda ingin menjadualkan masa untuk datang?",
      declineReason:
        "Menamatkan panggilan bermakna haiwan peliharaan anda mungkin terlepas vaksinasi penting mereka.",
      declineReasonSimple:
        "Haiwan peliharaan anda mungkin terlepas lawatan doktor mereka. Tidak mengapa untuk menjawab panggilan dari veterinar anda.",
      options: {
        "1": {
          text: "\"Ya, mari kita tempah satu slot untuk petang Selasa.\"",
          reason:
            "Ini pengingat rutin dari klinik yang dikenali. Menempah temujanji tidak mendedahkan anda kepada risiko.",
          reasonSimple:
            "Ini panggilan biasa. Menempah masa untuk pemeriksaan haiwan peliharaan anda adalah selamat.",
        },
      },
    },
    "20": {
      callerName: "Kebajikan Children's Hope",
      dialogue:
        "Helo, kami mengutip derma mendesak untuk rumah anak yatim yang terbakar semalam. Setiap dolar membantu. Boleh anda berikan nombor kad kredit anda melalui telefon untuk membuat derma $50 dengan cepat?",
      declineReason:
        "Menamatkan panggilan melindungi kemurahan hati anda daripada dieksploitasi oleh badan amal palsu.",
      declineReasonSimple:
        "Menamatkan panggilan adalah betul. Penipu berpura-pura menjadi badan amal untuk mencuri derma anda.",
      options: {
        "1": {
          text: "\"Sedih sekali, nombor kad saya ialah...\"",
          reason:
            "Penipu menggunakan cerita emosi untuk mempercepatkan anda. Jangan sesekali berikan butiran kad kredit melalui telefon kepada pemanggil yang belum disahkan. Sentiasa menderma melalui platform rasmi yang disahkan.",
          reasonSimple:
            "Penipu menggunakan cerita sedih untuk menipu anda. Jangan sesekali baca nombor kad kredit anda melalui telefon.",
        },
        "2": {
          text: "\"Saya lebih suka menderma melalui saluran rasmi. Saya akan buat penyelidikan sendiri dahulu sebelum membuat keputusan.\"",
          reason:
            "Cemerlang. Adalah lebih baik untuk menamatkan panggilan dan mencari badan amal sendiri untuk memastikan wang anda benar-benar pergi ke tujuan yang baik.",
          reasonSimple:
            "Bagus. Jika anda mahu membantu, gunakan laman web sebenar untuk memberi wang, bukan panggilan telefon rawak.",
        },
      },
    },
    "21": {
      callerName: "Crypto Kings",
      dialogue:
        "Hai, saya seorang penganalisis kanan kripto. Kami ada pelan pelaburan terjamin yang akan menggandakan wang anda dalam 3 hari. Saya hanya memerlukan anda menghantar $1,000 dalam Bitcoin ke dompet dagangan kami untuk bermula.",
      declineReason:
        "Menamatkan panggilan menyelamatkan anda daripada kehilangan simpanan kepada skim pelaburan palsu.",
      declineReasonSimple:
        "Menamatkan panggilan adalah bijak. Pakar wang palsu hanya mahu mencuri simpanan anda.",
      options: {
        "1": {
          text: "\"Pulangan terjamin? Sudah tentu saya akan hantar Bitcoin sekarang.\"",
          reason:
            "Semua pelaburan membawa risiko. Sesiapa yang menjanjikan pulangan tinggi 'terjamin' dalam masa singkat pada panggilan tanpa dijemput adalah penipu.",
          reasonSimple:
            "Janji wang pantas dan mudah selalunya pembohongan. Menghantar wang kepada mereka bermakna kehilangannya selamanya.",
        },
        "2": {
          text: "\"Saya tidak berminat. Selamat tinggal.\"",
          reason:
            "Menamatkan panggilan serta-merta adalah cara terbaik untuk mengendalikan penipuan pelaburan. Jangan sesekali percaya nasihat kewangan tanpa dijemput.",
          reasonSimple:
            "Pilihan yang bagus. Mengatakan tidak kepada tawaran wang pelik adalah cara terbaik untuk menjaga simpanan anda selamat.",
        },
      },
    },
  },
  whatsapp: {
    "1": {
      contactName: "HR - GlobalTech",
      openingMessages: {
        "m1":
          "Hai! Saya telah menyemak profil LinkedIn anda - kami ada jawatan penganalisis jarak jauh serta-merta. Berminat?",
      },
      declineReason:
        "Majikan sah tidak akan sesekali meminta yuran pendahuluan melalui PayNow di WhatsApp. Mengekang dan melaporkan adalah respons paling selamat.",
    },
    "2": {
      contactName: "Penghantaran SingPost",
      openingMessages: {
        "m1":
          "SingPost: Parcel anda ditahan. Bayar yuran penghantaran semula $1.50 dalam tempoh 2 jam: bit.ly/redeliver-sg",
      },
      declineReason:
        "Penipuan yuran penghantaran menggunakan pautan palsu untuk mencuri butiran pembayaran. Semak aplikasi atau laman web rasmi SingPost berbanding membayar melalui pautan sembang.",
    },
    "3": {
      contactName: "Ibu",
      openingMessages: {
        "m1":
          "Hei, nenek datang untuk makan malam malam ini sekitar pukul 7. Boleh anda beli pencuci mulut?",
      },
      declineReason:
        "Itu mesej sebenar dari keluarga. Mengekang tanpa membaca boleh bermakna terlepas sesuatu yang penting - tetapi jangan sesekali kongsi OTP atau pindahkan wang tanpa mengesahkan melalui panggilan.",
    },
    "4": {
      contactName: "SPF Rasmi",
      openingMessages: {
        "m1":
          "MENDESAK: Ini Pasukan Polis Singapura. Akaun bank anda dikaitkan dengan jenayah. Balas dengan foto NRIC anda untuk mengesahkan identiti anda.",
      },
      declineReason:
        "Pasukan Polis Singapura dan agensi kerajaan lain tidak berkomunikasi urusan rasmi atau meminta dokumen peribadi seperti NRIC melalui WhatsApp.",
      declineReasonSimple:
        "Polis sebenar tidak akan meminta kad pengenalan anda pada aplikasi mesej.",
    },
    "5": {
      contactName: "Amaran NinjaVan",
      openingMessages: {
        "m1":
          "NinjaVan: Penghantaran parcel anda gagal kerana nombor rumah tiada. Kemas kini alamat anda di sini dalam tempoh 24 jam: bit.ly/nv-update-sg",
      },
      declineReason:
        "Syarikat penghantaran tidak menghantar pautan yang belum disahkan melalui WhatsApp meminta kemas kini alamat atau yuran tambahan. Sentiasa jejak parcel melalui aplikasi rasmi.",
      declineReasonSimple:
        "Pemandu penghantaran tidak akan menghantar anda pautan untuk membayar wang atau menukar alamat anda.",
    },
    "6": {
      contactName: "Abang",
      openingMessages: {
        "m1":
          "Hei {{name}}, boleh beli sekepak susu dalam perjalanan pulang? Kita baru kehabisan ",
      },
      declineReason:
        "Ini mesej sebenar dari ahli keluarga meminta pertolongan ringkas. Tiada pautan mencurigakan atau tuntutan mendesak untuk wang.",
      declineReasonSimple:
        "Ini mesej sebenar dari keluarga anda. Ia selamat.",
    },
    "7": {
      contactName: "Kemas Kini CDC Kerajaan",
      openingMessages: {
        "m1":
          "Berita gembira! Anda layak mendapat Baucar CDC tambahan $100. Tuntut baucar anda di sini: cdc-claim-sg.com",
      },
      declineReason:
        "Baucar CDC rasmi hanya dituntut melalui laman web RedeemSG rasmi menggunakan Singpass, tidak pernah melalui pautan WhatsApp tidak rasmi.",
      declineReasonSimple:
        "Baucar sebenar dari kerajaan tidak pernah diberikan melalui pautan sembang.",
    },
    "8": {
      contactName: "Keselamatan DBS",
      openingMessages: {
        "m1":
          "Amaran DBS: Log masuk mencurigakan dikesan pada akaun anda. Sila kunci dana anda serta-merta di: secure-dbs-update.com",
      },
      declineReason:
        "Bank di Singapura tidak lagi menghantar mesej SMS atau WhatsApp yang mengandungi pautan boleh diklik. Sentiasa gunakan aplikasi perbankan rasmi.",
      declineReasonSimple:
        "Bank tidak akan sesekali menghantar anda pautan untuk membetulkan akaun anda.",
    },
    "9": {
      contactName: "Encik Tan (Pengajar Matematik)",
      openingMessages: {
        "m1":
          "Hai {{name}}, hanya mengingatkan anda tentang tuisyen matematik kita esok pukul 4 petang. Jangan lupa lengkapkan kerja rumah anda!",
      },
      declineReason:
        "Ini pengingat standard dari kenalan yang dikenali tanpa sebarang pautan mencurigakan atau permintaan data peribadi.",
      declineReasonSimple:
        "Ini mesej biasa dari pengajar anda. Tiada tanda amaran seperti pautan mencurigakan.",
    },
    "10": {
      contactName: "Sokongan WhatsApp",
      openingMessages: {
        "m1":
          "Keselamatan WhatsApp: Akaun anda telah dilaporkan. Sila balas dengan butiran ID anda untuk tujuan pengesahan.",
      },
      declineReason:
        "Sokongan WhatsApp tidak akan sesekali meminta maklumat peribadi anda seperti ID anda. Berkongsinya akan membenarkan penipu menyamar sebagai anda secara berniat jahat.",
      declineReasonSimple:
        "Jangan sesekali kongsi maklumat peribadi seperti ID anda. Jika anda berbuat demikian, penipu boleh menyamar sebagai anda.",
    },
    "11": {
      contactName: "Pengebilan Singtel",
      openingMessages: {
        "m1":
          "Singtel: Bil bulanan anda telah lewat. Untuk mengelakkan penggantungan perkhidmatan hari ini, sila bayar $45.50 serta-merta melalui PayNow ke +65 8555 4444",
      },
      declineReason:
        "Penyedia telekomunikasi tidak menuntut bayaran serta-merta melalui nombor PayNow yang mencurigakan. Sentiasa semak bil anda melalui aplikasi telco rasmi.",
      declineReasonSimple:
        "Syarikat telefon tidak meminta anda membayar bil menggunakan nombor PayNow yang mencurigakan.",
    },
    "12": {
      contactName: "Sokongan Netflix",
      openingMessages: {
        "m1":
          "Netflix: Pembayaran langganan terakhir anda ditolak. Akaun anda akan dikunci dalam 24 jam. Kemas kini kad anda di sini: netflix-billing-update.com",
      },
      declineReason:
        "Perkhidmatan penstriman menghantar e-mel rasmi, bukan mesej WhatsApp dari nombor tidak dikenali, jika ada isu pembayaran.",
      declineReasonSimple:
        "Aplikasi TV menghantar e-mel, bukan mesej sembang, jika ada masalah dengan pembayaran.",
    },
    "13": {
      contactName: "Chloe (Rakan Sejawat)",
      openingMessages: {
        "m1":
          "Hei, mesyuarat saya sebelum ini berlarutan. Boleh kita tangguhkan mesyuarat pukul 2 petang kita ke 2:15 petang?",
      },
      declineReason:
        "Soalan berkaitan kerja biasa dari kenalan yang dikenali tanpa sebarang permintaan kewangan atau pautan mencurigakan.",
      declineReasonSimple:
        "Ini mesej selamat dari seseorang di tempat kerja yang meminta menjadualkan semula mesyuarat.",
    },
    "14": {
      contactName: "HR Shopee",
      openingMessages: {
        "m1":
          "Helo! Kami menggaji kakitangan sambilan untuk Shopee. Peroleh $100 - $300 sehari hanya dengan mengklik dan mengulas produk. Boleh saya kongsi butiran lanjut?",
      },
      declineReason:
        "Platform e-dagang tidak menggaji melalui WhatsApp untuk 'tugas menaikkan' yang akhirnya memerlukan anda memindahkan wang anda sendiri.",
      declineReasonSimple:
        "Aplikasi membeli-belah sebenar tidak menawarkan kerja di sembang di mana anda perlu membayar wang lebih dahulu.",
    },
    "15": {
      contactName: "Pemberitahuan ICA",
      openingMessages: {
        "m1":
          "Amaran ICA: Pasport anda akan tamat tempoh tidak lama lagi. Untuk mengelakkan denda, sila lengkapkan permohonan pembaharuan anda dan bayar yuran di sini: ica-renew-sg.com",
      },
      declineReason:
        "Lembaga Imigresen & Pintu Kemasukan (ICA) tidak menghantar pautan melalui WhatsApp untuk pembaharuan pasport atau kutipan yuran.",
      declineReasonSimple:
        "Kerajaan tidak menghantar pautan di sembang untuk membetulkan pasport anda.",
    },
    "16": {
      contactName: "Crypto Master James",
      openingMessages: {
        "m1":
          "Hai kawan, saya menguruskan kolam kripto peribadi yang menjamin 15% keuntungan setiap hari dengan sifar risiko. Adakah anda mahu bermula dengan hanya $50?",
      },
      declineReason:
        "Janji pulangan tinggi dan terjamin dengan sifar risiko adalah penipuan pelaburan klasik. Firma sah tidak menghantar mesej sejuk di WhatsApp.",
      declineReasonSimple:
        "Orang yang tidak dikenali yang menawarkan wang percuma atau tunai pantas di sembang cuba menipu anda.",
    },
    "17": {
      contactName: "Dr. Alex (UK)",
      openingMessages: {
        "m1":
          "Hai Jenny, ini Dr. Alex. Kita masih berjumpa untuk kopi nanti? ... Oh, maaf, saya rasa saya menaip nombor yang salah. Gambar profil anda sangat cantik walaupun, anda dari mana?",
      },
      declineReason:
        "Penipu romantis membina kepercayaan dari masa ke masa, selalunya mendakwa sebagai profesional di luar negara, sebelum akhirnya meminta wang untuk kecemasan.",
      declineReasonSimple:
        "Orang yang tidak dikenali dari jauh yang cuba menjadi kawan anda di sembang selalunya mahu wang anda kemudian.",
    },
    "18": {
      contactName: "Penghantar GrabFood",
      openingMessages: {
        "m1":
          "Hai, GrabFood di sini. Saya berada di alamat anda tetapi tidak menjumpai unit anda. Boleh anda bantu tunjukkan jalan?",
      },
      declineReason:
        "Pemandu penghantaran selalunya menggunakan WhatsApp atau panggilan untuk menjelaskan alamat apabila mereka berdekatan. Ini tidak mengandungi pautan berniat jahat.",
      declineReasonSimple:
        "Adalah biasa bagi pemandu penghantaran untuk meminta arah tuju jika mereka tersesat.",
    },
    "19": {
      contactName: "Yayasan Hope",
      openingMessages: {
        "m1":
          "Bantu keluarga yang terjejas akibat banjir baru-baru ini. Setiap dolar penting. Sila derma terus ke dana bantuan kami melalui PayNow ke +65 8777 1234",
      },
      declineReason:
        "Penipu mengeksploitasi tragedi dengan menubuhkan badan amal palsu. Sentiasa menderma melalui platform yang diiktiraf seperti Giving.sg berbanding nombor PayNow yang tidak dikenali.",
      declineReasonSimple:
        "Orang jahat berpura-pura menjadi badan amal untuk mencuri wang. Hanya beri wang di laman web sebenar.",
    },
    "20": {
      contactName: "Pentadbir Gim ActiveSG",
      openingMessages: {
        "m1":
          "Hai {{name}}, dimaklumkan bahawa kelas Yoga pukul 6 petang hari ini dibatalkan kerana tenaga pengajar tidak sihat. Kredit anda telah dikembalikan. Minta maaf atas sebarang kesulitan yang dialami.",
      },
      declineReason:
        "Ini mesej pentadbiran rutin mengenai perubahan jadual, tanpa pautan, permintaan wang, atau pengambilan data peribadi.",
      declineReasonSimple:
        "Ini mesej biasa tentang masa kelas yang berubah. Ia selamat.",
    },
  },
};

export default ms;
