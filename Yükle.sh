#!/bin/bash 

#==============================================================================
#                               PARDUS SON KULLANICI YAMASI
#  Yazar         : MAHMUT ELMAS
#  İndirme Linki : https://github.com/mahmutelmas06/PardusYAMA
#  İletişim      : mahmutelmas06@gmail.com
#  Sürüm         : 0.1
#  Bağımlıkıklar : zenity ln
#  Lisans        : MIT - Diğer eklentilerin kendi lisansları bulunmaktadır
#
#==============================================================================
#
#  Tanım 
#  Pardusta son kullanıcının işini kolaylaştırmak için ek özellikler ekler 
#  -Masaüstü kısayol oluşturma
#  -Uygulama kısayolu oluşturma
#  -Sağ tık Yeni Metin Belgesi, Çalışma Tablosu, Sunu gibi özellikler
#  -Flatpak ve Winepak yüklenmesi
#  -Bazı sistemsel ön ayarlar  
#  -Kullanışlı birkaç Gnome eklentisi
#  -Grub teması değiştirildi
#  
#     
#
#==============================================================================


ROOT_UID=0	                        # Root Kimliği
MAX_DELAY=20                        # Şifre girmek için beklenecek süre

command -v gnome-shell >/dev/null 2>&1 || { zenity --error --text="Sisteminiz Gnome Shell değildir."; exit 1; } # Gnome Shell mi kontrol et. Değilse çıkış yap.

if [ "$UID" -eq "$ROOT_UID" ]; then # Root yetkisi var mı diye kontrol et.



action=$(zenity --list --checklist \
	--height 350 --width 700 \
	--title "İstediğiniz yamaları seçiniz. (Tamamını seçmeniz önerilir)" \
	--column "Seçim" 	--column "Yapılacak işlem" \
			  TRUE 				  "Bazı önyüklü uygulamaları kaldır" \
			  TRUE 				  "Sık kullanılan uygulama ve kütüphaneleri yükle" \
			  TRUE 				  "Sağ Tık / Yeni menüsünü ekle" \
			  TRUE 				  "Betikler menüsünü ekle" \
			  TRUE 				  "Gnome eklentilerini yükle ve sistem ince ayarlarını yap" \
			  TRUE 				  "Ücretsiz Windows fontlarını yükle" \
			  TRUE 				  "Görsel ve Modern İşletim Sistemi Seçenekleri menüsünü yükle" \
	--separator=":")
	
	

if [ -z "$action" ] ; then
   echo "Seçim yapılmadı"
   exit 1
fi

IFS=":" ; for word in $action ; do   #  Zenity checklist için çoklu seçim komutu başlat

case $word in "Bazı"*)              # Bazı uygulamaların kaldırılması ============================================

apt remove gdebi 					# Pardus Paket Yükleyici adı altında bir Gdebi kopyası zaten yüklü

;;

"Sık"*)  # Bazı uygulamaların yüklenmesi =========================================================

dpkg -i -R /Yazılım/*.deb
apt-get -fy install

apt-get install chrome-gnome-shell	# Gnome eklentileri tarayıcı eklentisini yükle

dpkg --add-architecture i386        # İ386 desteğini etkinleştir

apt install grub-customizer         # Grub giriş ekranını özelleştir

apt install python3-pip             # Pip komutunu kullanabilmek için gerekli kütüphane

apt install flatpak                                                                         # ------------------------------
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo     # Flatpak desteğini etkinleştir
flatpak remote-add --if-not-exists winepak https://dl.winepak.org/repo/winepak.flatpakrepo  # ------------------------------

apt install ffmpeg					# Video indirme ve düzenleme programları için gerekli uygulamayı yükle




git_check ()
{
  echo "Checking for git ..."
  if command -v git > /dev/null; then
    echo "Detected git ..."
  else
    echo "Installing git"
    apt install -y git				# Git yükle
  fi
}


UHOME="/home"
SAB="Şablonlar"
BET=".local/share/nautilus/scripts"
CONF=".config"
GNM=".local/share/gnome-shell/extensions" 

_FILESS="Şablonlar/*"                   
_FILESB="Betikler/*"			
_FILESG="GEklentiler/*"			

_USERS="$(awk -F':' '{ if ( $3 >= 500 && $3 <=1000 ) print $1 }' /etc/passwd)" # Kullanıcı listesini al

;;

"Sağ"*)  # Şablonları Yükle =========================================================


for u in $_USERS
do
  mkdir "${UHOME}/${u}/${SAB}"    #  Şablonlar klasörü oluşturulsun

  _dir="${UHOME}/${u}"


# .config/user-dirs.dirs dosyası yoksa oluştur.

	if [[ ! -f $_dir/${CONF}/user-dirs.dirs ]];
	then
		xdg-user-dirs-update
		echo "Config dosyası oluşturuldu.."
	else

		source $_dir/${CONF}/user-dirs.dirs
		if [[ $XDG_Templates_DIR = "$HOME/Şablonlar" ]]
		then
			echo "Herşey hazır durumda. Çıkılıyor.."
		fi

	fi

   for f in $_FILESS
   do
    
     
     if [ -d "$_dir" ]
     then

       file_name=`basename ${f}

       cp -r "${f}" "$_dir/${SAB}" #  Şablonları kopyala

	`

       find "${f}" "$_dir/${SAB}" -type f -exec chmod 777 {} \+ # Şablon izinleri


     fi
done
done

;;

"Betikler"*)  # Betikleri Yükle =========================================================


for u in $_USERS
do

  mkdir "${UHOME}/${u}/${BET}"    #  Betikler klasörü oluşturulsun


  _dir="${UHOME}/${u}"

   for f in $_FILESB
   do
    
     
     if [ -d "$_dir" ]
     then

       file_name=`basename ${f}

       cp -r "${f}" "$_dir/${BET}" #  Betikleri kopyala


	`
       find "${f}" "$_dir/${BET}" -type f -exec chmod 777 {} \+ # Betik izinleri

     fi
done
done

;;

"Gnome"*)  # GNOME EKLENTİLERİNİ Yükle =========================================================


for u in $_USERS
do

  mkdir "${UHOME}/${u}/${GNM}"    #  Betikler klasörü oluşturulsun


  _dir="${UHOME}/${u}"


   for f in $_FILESG
   do
    
     
     if [ -d "$_dir" ]
     then

       file_name=`basename ${f}

       cp -r "${f}" "$_dir/${GNM}" #  EKLENTİLERİ kopyala


	`
       find "${f}" "$_dir/${GNM}" -type f -exec chmod 777 {} \+ # EKLENTİ izinleri

     fi
done
done


# Gnome Ayarları  # # # # # # # # # # # # # # # # # # # # # # #  # # # #

dconf write /org/gnome/nautilus/preferences/executable-text-activation "'ask'"

dconf write /org/gnome/nautilus/preferences/show-create-link true

dconf write /org/gnome/nautilus/icon-view/captions "['size', 'none', 'none']"

dconf write /org/gnome/desktop/background/show-desktop-icons true

dconf write /org/gnome/desktop/sound/allow-volume-above-100-percent true

dconf write /org/gnome/login-screen/disable-restart-buttons false

dconf write /org/gnome/shell/extensions/apt-update-indicator/autoremovable-packages false

dconf write /org/gnome/shell/extensions/apt-update-indicator/new-packages false

dconf write /org/gnome/shell/extensions/apt-update-indicator/obsolete-packages false

dconf write /org/gnome/shell/extensions/apt-update-indicator/residual-packages false

dconf write /org/gnome/shell/extensions/arc-menu/show-external-devices true

dconf write /org/gnome/shell/extensions/arc-menu/menu-button-icon "'Start_Box'"

dconf write /org/gnome/shell/extensions/arc-menu/enable-sub-menus true

dconf write /org/gnome/desktop/wm/keybindings/panel-main-menu "['Super_R']"

dconf write /org/gnome/shell/extensions/dash-to-panel/show-appmenu false

dconf write /org/gnome/shell/extensions/laine/merge-controls true

dconf write /org/gnome/shell/extensions/lockkeys/style "'show-hide'"

dconf write /org/gnome/shell/window-switcher/app-icon-mode "'both'"

gnome-shell-extension-tool -e add-on-desktop@maestroschan.fr

gnome-shell-extension-tool -e appfolders-manager@maestroschan.fr

gnome-shell-extension-tool -e applications-overview-tooltip@RaphaelRochet

gnome-shell-extension-tool -e arc-menu@linxgem33.com

gnome-shell-extension-tool -e custom-hot-corners@janrunx.gmail.com

gnome-shell-extension-tool -e bluetooth-quick-connect@bjarosze.gmail.com

gnome-shell-extension-tool -d clipboard-indicator@tudmotu.com

gnome-shell-extension-tool -e ding@rastersoft.com

gnome-shell-extension-tool -d gnome-shell-screenshot@ttll.de

gnome-shell-extension-tool -e gsconnect@andyholmes.github.io

gnome-shell-extension-tool -e laine@knasher.gmail.com

gnome-shell-extension-tool -e lockkeys@vaina.lt

gnome-shell-extension-tool -e noannoyance@daase.net

gnome-shell-extension-tool -e soft-brightness@fifi.org

gnome-shell-extension-tool -e tweaks-system-menu@extensions.gnome-shell.fifi.org

gnome-shell-extension-tool -e update-extensions@franglais125.gmail.com

gnome-shell-extension-tool -e alternate-tab@gnome-shell-extensions.gcampax.github.com

gnome-shell-extension-tool -e user-theme@gnome-shell-extensions.gcampax.github.com

gnome-shell-extension-tool -d apps-menu@gnome-shell-extensions.gcampax.github.com

gnome-shell-extension-tool -d drive-menu@gnome-shell-extensions.gcampax.github.com

gnome-shell-extension-tool -d places-menu@gnome-shell-extensions.gcampax.github.com

gnome-shell-extension-tool -d window-list@gnome-shell-extensions.gcampax.github.com

rm -f -r $HOME/.local/share/gnome-shell/extensions/add-on-desktop@maestroschan.fr

rm -f -r /usr/local/share/gnome-shell/extensions/add-on-desktop@maestroschan.fr

gnome-shell --replace &

;;
"Ücretsiz"*)  #  Temel Microsoft ücretsiz fontları yükleme =========================================================


	# /usr/share/fonts/truetype/msttcorefonts kasörü var mı kontrol et
	if [ ! -d /usr/share/fonts/truetype/msttcorefonts ];
	then
		mkdir /usr/share/fonts/truetype/msttcorefonts
		cp -r Fontlar/* /usr/share/fonts/truetype/msttcorefonts
		echo -e "\nFontlar yüklendi.."
	else
		# varsa yeni klasör oluşturmayı atla
		cp -r Fontlar/* /usr/share/fonts/truetype/msttcorefonts
		echo "\nÜcretsiz Windows Fontları yüklendi."
	fi

	find /usr/share/fonts/truetype/msttcorefonts -type f -exec chmod 775 {} \+
	fc-cache

;;

"Görsel"*)  # Grub2 Tema Yükleme  =========================================================


THEME_DIR="/usr/share/grub/themes"
THEME_NAME=tela
GFXBT=4096x2160,1920x1080,1366x768,1024x768,auto


  # Create themes directory if not exists
  [[ -d ${THEME_DIR}/${THEME_NAME} ]] && rm -rf ${THEME_DIR}/${THEME_NAME}
  mkdir -p "${THEME_DIR}/${THEME_NAME}"

  # Copy theme

  cp -a /Grub/${THEME_NAME}/* ${THEME_DIR}/${THEME_NAME}

  # Set theme

  # Backup grub config
  cp -an /etc/default/grub /etc/default/grub.bak

  grep "GRUB_THEME=" /etc/default/grub 2>&1 >/dev/null && sed -i '/GRUB_THEME=/d' /etc/default/grub
  echo "GRUB_THEME=\"${THEME_DIR}/${THEME_NAME}/theme.txt\"" >> /etc/default/grub
  echo "GRUB_GFXMODE=\"${GFXBT}\"" >> /etc/default/grub
  echo "GRUB_GFXPAYLOAD_LINUX=\"${GFXBT}\"" >> /etc/default/grub

  # Update grub config

    update-grub

;;      
esac
done   #  Zenity checklist için çoklu seçim komutu kapat


# # # # # # # # # # # # # # # # # # # # # # #  # # # # # # # # # # # # # # # # # # # # # # # 


# İşlem tamamlanmıştır

notify-send -t 2000 -i /usr/share/icons/gnome/32x32/status/info.png "İşlem Tamamlanmıştır"


else

  # Error message to continue
  notify-send -t 2000 -i /usr/share/icons/gnome/32x32/status/info.png "Yönetici olarak çalıştırın"

  # persisted execution of the script as root
  read -p "Devam etmek için Yönetici şifrenizi girin : " -t${MAX_DELAY} -s
  [[ -n "$REPLY" ]] && {
    sudo -S <<< $REPLY $0
  } || {
    notify-send -t 2000 -i /usr/share/icons/gnome/32x32/status/info.png "Yönetici şifresini girmediğiniz için iptal edildi"
    exit 1
  }
fi


