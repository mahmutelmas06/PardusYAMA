#!/bin/bash 

#==============================================================================
#                               PARDUS SON KULLANICI YAMASI
#  Yazar         : MAHMUT ELMAS
#  İndirme Linki : https://github.com/mahmutelmas06/PardusYAMA
#  İletişim      : mahmutelmas06@gmail.com
#  Sürüm         : 0.2
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
#  -Sistem ve Yazılım Güncelleştirmelerinin yapılması
#  -Bazı uygulamaların Flatpak sürümleri  ile değiştirilmesi   
#  -Yükleme önizleme penceresinin eklenmesi
#
#==============================================================================



ROOT_UID=0	                        		# Root Kimliği
MAX_DELAY=20                        		# Şifre girmek için beklenecek süre


if [ "$UID" -eq "$ROOT_UID" ]; then 		# Root yetkisi var mı diye kontrol et.


#==============================================================================

(
echo "# Seçim bekleniyor." ; sleep 2  		# Zenity yükleme göstergesi başlangıç

#==============================================================================


# command -v gnome-shell >/dev/null 2>&1 || { zenity --error --text="Sisteminiz Gnome Shell değildir."; exit 1; } # Gnome Shell mi kontrol et. Değilse çıkış yap.
# apt-get -y install zenity 


#==============================================================================

_USERS="$(eval getent passwd {$(awk '/^UID_MIN/ {print $2}' /etc/login.defs)..$(awk '/^UID_MAX/ {print $2}' /etc/login.defs)} | cut -d: -f1)" # Kullanıcı listesini al
RUSER_UID=$(id -u ${_USERS})
UHOME="/home"


#==============================================================================


action=$(zenity --list --checklist \
	--height 350 --width 700 \
	--title "İstediğiniz yamaları seçiniz. (Tamamını seçmeniz önerilir)" \
	--column "Seçim" 	--column "Yapılacak işlem" \
			  TRUE 				  "Bazı önyüklü uygulamaları kaldır" \
			  TRUE 				  "Sık kullanılan uygulamaları yükle ve Sistemi Güncelleştir" \
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


IFS=":" ; for word in $action ; do   		#  Zenity checklist için çoklu seçim komutu başlat
case $word in 

#==============================================================================


"Bazı"*)              						# Bazı uygulamaların kaldırılması ============================================
echo "5"
echo "# Bazı uygulamalar sistemden kaldırılıyor." ; sleep 2

apt-get -y remove gdebi						# Pardus Paket Yükleyici adı altında bir Gdebi kopyası zaten yüklü
apt-get -y remove gimp              		# Pinta zaten yüklü. İhtiyaç duyan Gimp yükleyebilir.
apt-get -y remove vlc						# Totem silinemediği için Vlc silindi. Sistemde 2 adet aynı işi yapan uygulamayı bulundurmamak amacıyla

# Buraya ayrıca sistem önbelleği/ gereksiz dosyaları temizleme kodları eklenecek

;;

"Sık"*)  # Sık kullanjılan bazı uygulamaların yüklenmesi ==================================================================

echo "15"
echo "# Sistem güncelleniyor." ; sleep 2

apt-get update && apt-get -y upgrade && apt-get -y dist-upgrade								# Sistemi GÜncelleştir

echo "20"
echo "# Sık kullanılan uygulamalar yükleniyor." ; sleep 2

dpkg -R --install ./Yazılımlar/
apt-get -fy install

apt-get -y install chrome-gnome-shell		# Gnome eklentileri tarayıcı eklentisini yükle

dpkg --add-architecture i386            	# İ386 desteğini etkinleştir

apt-get -y install python3-pip          	# Pip komutunu kullanabilmek için gerekli kütüphane

apt-get -y install git

apt-get -y install flatpak                                                                  # ------------------------------
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo     # Flatpak desteğini etkinleştir
flatpak remote-add --if-not-exists winepak https://dl.winepak.org/repo/winepak.flatpakrepo  # ------------------------------

apt-get -y install ffmpeg					# Video indirme ve düzenleme programları için gerekli uygulamayı yükle
apt-get -y install imagemagick				# Resim indirme ve düzenleme programları için gerekli uygulamayı yükle

apt-get -y install icoutils
apt-get -y install gir1.2-flatpak-1.0


# Wine yükleniyor ve yapılandırılıyor
echo "33"
echo "# Wine yükleniyor ve yapılandırılıyor." ; sleep 2

apt-get -y install wine
apt-get -y install winetricks
winetricks -q directx9 vcrun2005 vcrun2008 vcrun2010 vcrun2003 vcrun2015 vcrun2017 vcrun6sp6


# Uygulamaların Flatpak sürümleriyle değiştirilmesi

echo "35"
echo "# Bazı yazılımlar Flatpak sürümleri ile değiştirilip güncelleştiriliyor." ; sleep 2

apt-get -y remove thunderbird
flatpak install flathub org.gnome.Geary

apt-get -y purge libreoffice
flatpak install flathub org.libreoffice.LibreOffice

# Sekmeli görüntü aktifleştirilecek
# Yeni simge paketi yüklenecek


# Firefox yükle ve ayarlarını yap

apt-get -y remove firefox-esr
flatpak install flathub org.mozilla.firefox


#============================================================================== Bunlar bir köşede dursun userpref.js
#user_pref("browser.startup.homepage", "https://vuhuv.com.tr/");
#user_pref("app.shield.optoutstudies.enabled", false);
#user_pref("browser.download.useDownloadDir", false);
#user_pref("browser.newtabpage.activity-stream.feeds.snippets", false);
#user_pref("browser.newtabpage.activity-stream.section.highlights.includeDownloads", false);
#user_pref("browser.newtabpage.activity-stream.section.highlights.includePocket", false);
#user_pref("browser.newtabpage.activity-stream.section.highlights.includeVisited", false);
#user_pref("browser.safebrowsing.malware.enabled", false);
#user_pref("browser.safebrowsing.phishing.enabled", false);
#user_pref("browser.shell.checkDefaultBrowser", true);
#user_pref("browser.startup.page", 3);
#user_pref("browser.tabs.drawInTitlebar", true);
#user_pref("browser.tabs.extraDragSpace", true);
#user_pref("browser.uiCustomization.state", "{\"placements\":{\"widget-overflow-fixed-list\":[],\"nav-bar\":[\"back-button\",\"forward-button\",\"stop-reload-button\",\"find-button\",\"customizableui-special-spring5\",\"urlbar-container\",\"customizableui-special-spring2\",\"downloads-button\",\"history-panelmenu\",\"bookmarks-menu-button\",\"fxa-toolbar-menu-button\"],\"toolbar-menubar\":[\"menubar-items\"],\"TabsToolbar\":[\"tabbrowser-tabs\",\"new-tab-button\",\"alltabs-button\"],\"PersonalToolbar\":[\"personal-bookmarks\"]},\"seen\":[\"developer-button\"],\"dirtyAreaCache\":[\"nav-bar\",\"toolbar-menubar\",\"TabsToolbar\",\"PersonalToolbar\"],\"currentVersion\":16,\"newElementCount\":6}");
#user_pref("browser.uidensity", 2);
#user_pref("datareporting.healthreport.uploadEnabled", false);
#user_pref("extensions.pendingOperations", true);
#user_pref("extensions.ui.dictionary.hidden", true);
#user_pref("extensions.ui.lastCategory", "addons://discover/");
#user_pref("extensions.ui.locale.hidden", false);
#user_pref("media.eme.enabled", true);
#ser_pref("pref.general.disable_button.default_browser", false);
#user_pref("privacy.donottrackheader.enabled", true);
#user_pref("toolkit.telemetry.cachedClientID", "c0ffeec0-ffee-c0ff-eec0-ffeec0ffeec0");

echo "39"
echo "# Kalıntılar temizleniyor." ; sleep 2

apt-get -y autoremove																		# Kalıntıları sil



;;



"Sağ"*)  # Şablonları Yükle ============================================================================================
echo "45"
echo "# Şablonlar oluşturuluyor." ; sleep 2

SAB="Şablonlar"
CONF=".config"
_FILESS="./Şablonlar/*"  

for u in $_USERS
do

  _dir="${UHOME}/${u}"
  
  # .config/user-dirs.dirs dosyası yoksa oluştur.

	if [[ ! -f "$_dir/${SAB}"/user-dirs.dirs ]];
	then
	
		xdg-user-dirs-update
		
	else

		source "$_dir"/.config/user-dirs.dirs
		if [[ $XDG_Templates_DIR = "$_dir/${SAB}" ]]
		then
		echo "Herşey hazır durumda. Çıkılıyor.."
		fi

	fi

   for f in $_FILESS
   do
    

       cp -r "${f}" "$_dir/${SAB}" #  Şablonları kopyala

       find "$_dir/${SAB}/" -type f -exec chmod 777 {} \+ # Şablon izinleri
       
       chown $(id -un $u):$(id -gn $u) "$_dir/${SAB}/"

done
done
  



;;

"Betikler"*)  # Betikleri Yükle ============================================================================================
echo "50"
echo "# Betikler yükleniyor." ; sleep 2


BET=".local/share/nautilus/scripts"               
_FILESB="./Betikler/*"	

for u in $_USERS
do

  _dir="${UHOME}/${u}"

   for f in $_FILESB
   do
    

       cp -r "${f}" "$_dir/${BET}" #  Betikleri kopyala

       find "$_dir/${BET}/" -type f -exec chmod 777 {} \+ # Betik izinleri
       
       chown $(id -un $u):$(id -gn $u) "$_dir/${BET}/"

done
done

;;

"Gnome"*)  # GNOME EKLENTİLERİNİ Yükle ==============================================================================
echo "55"
echo "# Gnome eklentileri yükleniyor." ; sleep 2

GNM=".local/share/gnome-shell/extensions" 		
_FILESG="./GEklentiler/*"

for u in $_USERS
do

  _dir="${UHOME}/${u}"

   for f in $_FILESG
   do
    

       cp -r "${f}" "$_dir/${GNM}" #  Dosyaları kopyala
       cp -r "${f}" "/usr/share/gnome-shell/extensions" #  Dosyaları sistem dizinine kopyala

       find "$_dir/${GNM}/" -type f -exec chmod 777 {} \+ # Eklenti izinleri
       find "/usr/share/gnome-shell/extensions" -type f -exec chmod 777 {} \+ # Sistem eklenti izinleri
       
       chown $(id -un $u):$(id -gn $u) "$_dir/${GNM}/"

done
done


# Gnome Ayarları  # # # # # # # # # # # # # # # # # # # # # # #  # # # #

echo "60"
echo "# Sistem ince ayarları yapılıyor." ; sleep 2



sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e arc-menu@linxgem33.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e arc-menu@linxgem33.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/nautilus/preferences/executable-text-activation "'ask'"

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/nautilus/preferences/show-create-link true

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/nautilus/icon-view/captions "['size', 'none', 'none']"

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/desktop/background/show-desktop-icons true

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/desktop/sound/allow-volume-above-100-percent true

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/login-screen/disable-restart-buttons false

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/apt-update-indicator/autoremovable-packages false

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/apt-update-indicator/new-packages false

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/apt-update-indicator/obsolete-packages false

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/apt-update-indicator/residual-packages false

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/arc-menu/show-external-devices true

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/arc-menu/menu-button-icon "'Start_Box'"

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/arc-menu/enable-sub-menus true

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/desktop/wm/keybindings/panel-main-menu "['Super_R']"

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/dash-to-panel/show-appmenu false

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/laine/merge-controls true

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/lockkeys/style "'show-hide'"

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/window-switcher/app-icon-mode "'both'"

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e add-on-desktop@maestroschan.fr

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e appfolders-manager@maestroschan.fr

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e applications-overview-tooltip@RaphaelRochet

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e custom-hot-corners@janrunx.gmail.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d clipboard-indicator@tudmotu.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e ding@rastersoft.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d gnome-shell-screenshot@ttll.de

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e gsconnect@andyholmes.github.io

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e laine@knasher.gmail.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e lockkeys@vaina.lt

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e noannoyance@daase.net

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e soft-brightness@fifi.org

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e tweaks-system-menu@extensions.gnome-shell.fifi.org

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e update-extensions@franglais125.gmail.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e alternate-tab@gnome-shell-extensions.gcampax.github.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e user-theme@gnome-shell-extensions.gcampax.github.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d apps-menu@gnome-shell-extensions.gcampax.github.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d drive-menu@gnome-shell-extensions.gcampax.github.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d places-menu@gnome-shell-extensions.gcampax.github.com

sudo -u ${_USERS} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d window-list@gnome-shell-extensions.gcampax.github.com

rm -rf  /usr/local/share/gnome-shell/extensions/add-on-desktop@maestroschan.fr/

rm -rf ${UHOME}/${_USERS}/.local/share/gnome-shell/extensions/add-on-desktop@maestroschan.fr/


dconf update





;;
"Ücretsiz"*)  #  Temel Microsoft ücretsiz fontları yükleme =========================================================
echo "70"
echo "# Windows fontları yükleniyor." ; sleep 2


	# /usr/share/fonts/truetype/msttcorefonts kasörü var mı kontrol et
	if [ ! -d /usr/share/fonts/truetype/msttcorefonts ];
	then
		mkdir /usr/share/fonts/truetype/msttcorefonts
		cp -r Fontlar/* /usr/share/fonts/truetype/msttcorefonts
		echo -e "\Fontlar yüklendi.."
	else
		# varsa yeni klasör oluşturmayı atla
		cp -r Fontlar/* /usr/share/fonts/truetype/msttcorefonts
		echo "\Ücretsiz Windows Fontları yüklendi."
	fi

	find /usr/share/fonts/truetype/msttcorefonts -type f -exec chmod 775 {} \+
	fc-cache

;;

"Görsel"*)  # Grub2 Tema Yükleme  =====================================================================================
echo "90"
echo "# Yeni Grub teması yükleniyor." ; sleep 2

THEME_DIR="/usr/share/grub/themes"
THEME_NAME=tela
GFXBT=4096x2160,1920x1080,1366x768,1024x768,auto


  # Create themes directory if not exists
  [[ -d ${THEME_DIR}/${THEME_NAME} ]] && rm -rf ${THEME_DIR}/${THEME_NAME}
  mkdir -p "${THEME_DIR}/${THEME_NAME}"

  # Copy theme

  cp -a ${THEME_NAME}/* ${THEME_DIR}/${THEME_NAME}

  # Set theme

  # Backup grub config
  cp -an /etc/default/grub /etc/default/grub.bak

  grep "GRUB_THEME=" /etc/default/grub 2>&1 >/dev/null && sed -i '/GRUB_THEME=/d' /etc/default/grub
  echo "GRUB_THEME=\"${THEME_DIR}/${THEME_NAME}/theme.txt\"" >> /etc/default/grub
  grep "GRUB_GFXMODE=" /etc/default/grub 2>&1 >/dev/null && sed -i '/GRUB_GFXMODE=/d' /etc/default/grub
  echo "GRUB_GFXMODE=\"${GFXBT}\"" >> /etc/default/grub
  grep "GRUB_GFXPAYLOAD_LINUX=" /etc/default/grub 2>&1 >/dev/null && sed -i '/GRUB_GFXPAYLOAD_LINUX=/d' /etc/default/grub
  echo "GRUB_GFXPAYLOAD_LINUX=\"${GFXBT}\"" >> /etc/default/grub

  

  update-grub			# Yeni grub ayarları güncellenerek etkinleştirilsin

;;      
esac
done   #  Zenity checklist için çoklu seçim komutu kapat


# # # # # # # # # # # # # # # # # # # # # # #  # # # # # # # # # # # # # # # # # # # # # # # 


# İşlem tamamlanmıştır

notify-send -t 2000 -i /usr/share/icons/gnome/32x32/status/info.png "İşlem Tamamlanmıştır"

echo "# Tamamlandı." ; sleep 2
echo "100"
) |
zenity --progress \
  --title="Yükleme İlerlemesi" \
  --text="Yönetici yetkileri sağlanıyor." \
  --percentage=0 \
  --pulsate

(( $? != 0 )) && zenity --error --text="Error in zenity command."

exit 0

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



