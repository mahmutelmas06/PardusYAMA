#!/bin/bash 

#==============================================================================
# -------------------  PARDUS SON KULLANICI YAMASI ---------------------------
#  Yazar         : MAHMUT ELMAS
#  İndirme Linki : https://github.com/mahmutelmas06/PardusYAMA
#  İletişim      : mahmutelmas06@gmail.com
#  Sürüm         : 0.5
#  Bağımlıkıklar : zenity apt wget
#  Lisans        : MIT - Bazı eklentilerin kendi lisansları bulunmaktadır
#
#==============================================================================
#
#  ---------------------------  Tanım  ---------------------------
#  Pardusta son kullanıcının Pardus'a olan ilgisini çekmek ve komut satırını en aza indirmek için ek özellikler ekler. 
# 
# 
#  -Gnome ve XFCE uyumludur
#  -Masaüstüne kısayol oluşturma seçeneği (Gnome)
#  -Masaüstüne Uygulama kısayolu oluşturma seçeneği (Gnome)
#  -Sağ tık Yeni Metin Belgesi, Çalışma Tablosu, Yeni Sunu gibi özellikler
#  -Tek tıkla Flatpak ve Flatpakref dosyaları yüklenmesi
#  -Bazı sistemsel ön ayarlar otomatik olarak gerçekleşir 
#  -Olmazsa olmaz bazı Gnome, XFCE eklentileri ve uygulamaları yüklenir
#  -Grub teması daha görsel bir arayüz ile değiştirilir
#  -Sistem ve sisemdeki tüm yazılımların güncelleştirmeleri gerçekleştirilir
#  -Bazı uygulamalar Flatpak sürümleri ile değiştirilir  
#  -XFCE de önyüklü bazı uygulamalar Gnome eşdeğerleri ile değiştirilerek benzer arayüz sağlanır
#  -Dosya ve yazıcı paylaşımı uygulaması (Samba, Nautilus-Shares, Thunar-Shares) yüklenir ve ayarları yapılır
#  -Windows uygulamalarını Pardus'ta çalıştıracak uygulama (Wine) yüklenir ve ayarları yapılır
#  -Masaüstü sürükle bırak desteği eklenir (Gnome)
#  -Ücretsiz Windows fontları yüklenir
#  -Başlat menüsü eklenir (Gnome Arc Menu)
#==============================================================================





ROOT_UID=0	                        		# Root Kimliği
MAX_DELAY=20                        		# Şifre girmek için beklenecek süre
if [ "$UID" -eq "$ROOT_UID" ]; then 		# Root yetkisi var mı diye kontrol et.

#==============================================================================


_USERS="$(awk -F'[/:]' '{if ($3 >= 1000 && $3 != 65534) print $1}' /etc/passwd)" 	# Sistemdeki kullanıcıları listele
RUSER_UID=$(id -u ${_USERS})													 	# Kullanıcı ID kimlikleri

for u in ${_USERS}							# Tüm betik Root olarak çalıştığı için kullanıcı bazlı işlemleri gerçekleştirir
do

UHOME="/home"
CONF=".config"
_dir="${UHOME}/${u}"

#==============================================================================

# Masaüstü türünü belirle GNOME, KDE veya XFCE

desktop=$(echo "$XDG_DATA_DIRS" | sed 's/.*\(xfce\|kde\|gnome\).*/\1/')
desktop=${desktop,,}  						# Küçük harflere dönüştür
xfce=$xfce
gnome=$gnome


#==============================================================================

# Olası Paket sorunlarına karşı önlemler

( 	  # Zenity yükleme göstergesi başlangıç
echo "# Yükleme işlemi başlatılıyor." ; sleep 2		
									 
echo "15"
echo "# Varsa APT sorunları çözülüyor..." ; sleep 2	

rm /var/lib/apt/lists/lock
rm /var/cache/apt/archives/lock
dpkg --configure -a
#dpkg --remove --force-remove --reinstreq
apt-get install -fy

echo "35"
echo "# Sisteme 32 Bit \ndesteği eklenyor..." ; sleep 2	

dpkg --add-architecture i386            													# İ386 desteğini etkinleştir

echo "70"
echo "# Flatpak yükleniyor ve \nFlathub deposu ekleniyor..." ; sleep 2	

apt-get -y update
apt-get -y install flatpak                                                                  # ------------------------------
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo     # Flatpak desteğini etkinleştir
flatpak remote-add --if-not-exists winepak https://dl.winepak.org/repo/winepak.flatpakrepo  # ------------------------------

echo "# Önyükleme tamamlandı. \n \nYükleme için kullanıcı seçimi bekleniyor..." ; sleep 2
echo "100"

) |
zenity --progress \
  --title="Hazırlanıyor..." \
  --text="Yükleme başlatılıyor." \
  --percentage=0 \
  --pulsate \
  --auto-close

#==============================================================================
												  			
# command -v wget >/dev/null 2>&1 || { zenity --error --text="Please install wget"; exit 1; }



if [[ $desktop = $xfce ]]; then

action=$(zenity --list --checklist \
	--height 500 --width 1000 \
	--title "İstediğiniz Yamaları Seçiniz." \
	--column "Seçim" 	--column "Yapılacak işlem" 													--column "Açıklama" \
			  TRUE 				 "Yazılımları güncelleştir ve modernize et" 		   						 "Benzer yazılımlar silinir, birçoğu Flatpak sürümleri ile değiştirilir. " \
			  TRUE 				 "Oyuncu araçlarını yükle" 												 	 "Steam ve Lutris yüklenerek gerekli ayarlar yapılır" \
			  TRUE 				 "Wine yükle" 																 "Windows yazılımlarını Pardus'ta çalıştırabilmek için gereklidir" \
			  TRUE 				 "Samba yükle ve yapılandır" 												 "Yerel ağda dosya ve yazıcı paylaşımı yapabilmek için gereklidir" \
			  TRUE 				 "Betikleri ve Şablonları yükle" 											 "Sağ Tık menüsüne Yeni Belge, Masaüstü Kısayolu oluştur gibi seçenekler ekler" \
			  TRUE 				 "XFCE Ayarlarını yap"		 												 "XFCE arayüzünü daha modern bir hale getirir" \
			  TRUE 				 "Fontlar yükle"															 "Ücretsiz Temel Windows fontlarını yükler" \
			  TRUE 				 "Grub teması yükle"														 "İşletim Sistemi Seçenekleri menüsünü görsel ve modern bir hale getirir" \
			--separator=":")


else

action=$(zenity --list --checklist \
	--height 500 --width 975 \
	--title "İstediğiniz Yamaları Seçiniz." \
	--column "Seçim" 	--column "Yapılacak işlem" 													--column "Açıklama" \
			  TRUE 				  "Yazılımları güncelleştir ve modernize et" 			 					 "Benzer yazılımlar silinir, birçoğu Flatpak sürümleri ile değiştirilir. " \
			  TRUE 				  "Oyuncu araçlarını yükle" 												 "Steam ve Lutris yüklenerek gerekli ayarlar yapılır" \
			  TRUE 				  "Wine yükle" 																 "Windows yazılımlarını Pardus'ta çalıştırabilmek için gereklidir" \
			  TRUE 				  "Samba yükle ve yapılandır" 												 "Yerel ağda dosya ve yazıcı paylaşımı yapabilmek için gereklidir" \
			  TRUE 				  "Betikleri ve Şablonları yükle" 											 "Sağ Tık menüsüne Yeni Belge, Masaüstü Kısayolu oluştur gibi seçenekler ekler" \
			  TRUE 				  "Gnome eklentilerini yükle ve sistem ince ayarlarını yap" 				 "Bilgisyarınıza yeni özellikler ekler" \
			  TRUE 				  "Fontlar yükle"															 "Ücretsiz Temel Windows fontlarını yükler" \
			  TRUE 				  "Grub teması yükle"														 "İşletim Sistemi Seçenekleri menüsünü görsel ve modern bir hale getirir" \
			--separator=":")
fi



if [ -z "$action" ] ; then
   echo "Seçim yapılmadı"
   exit 1
fi


IFS=":" ; for word in $action ; do   		#  Zenity checklist için çoklu seçim komutu başlat
case $word in 

#==============================================================================


"Yazılımları"*)              				# Bazı uygulamaların kaldırılması ve yenilerinin yüklenmesi =======================



echo "# Sistem \n güncelleştiriliyor..." ; sleep 2
apt-get -y upgrade && apt-get -y dist-upgrade && apt-get -y full-upgrade

echo "# Benzer işleri yapan uygulamalar sistemden kaldırılıyor ve bazı yeni uygulamalar yükleniyor." ; sleep 2

apt-get -y remove gdebi						# Pardus Paket Yükleyici adı altında bir Gdebi kopyası zaten yüklü
apt-get -y remove gimp              		# Son kullanıcı için Pinta zaten yüklü. İhtiyaç duyan grafikçiler Gimp yükleyebilir.
apt-get -y remove vlc						# Totemimiz vaaar.

if [[ $desktop = $gnome ]]; then
apt-get -y remove synaptic					# Gnome paketler ile aynı paketleri listeliyor. Gnome paketler bağımlılıktan ve güncelleme yardımcısından dolayı kaldırılamıyor.
apt-get -y install materia-gtk-theme
fi


if [[ $desktop = $gnome ]]; then
apt-get -y install chrome-gnome-shell		# Gnome eklentileri tarayıcı eklentisini yükle
fi

apt-get -y install ninja-build meson sassc make        						 			 	 # Son kullanıcı olmasa da Çok kullanıcı için :)
#apt-get -y install python3-pip git

apt-get -y install gtk2-engines-murrine gtk2-engines-pixbuf									 # Sisteme tema eklerken istenen bağımlılıklar

apt-get -y install ffmpeg 					# Video ve resim indirme ve düzenleme programları için gerekli uygulamaları yükle
#apt-get -y install imagemagick	

echo "# Bazı yazılımlar Flatpak sürümleri ile değiştirilip güncelleştiriliyor.\n \nBu işlem internet hızınıza göre biraz zaman alabilir." ; sleep 2

if [[ $desktop = $xfce ]]; then
apt-get -y remove hddtemp xfce4-clipman deepin-deb-installer thunderbird mousepad xfce4-notes ristretto xfce4-dict xfburn xfce4-sensors-plugin xfce4-appfinder

apt-get -y install gedit					# Pardus Gnome sürümünde de Totem, Gedit ve EOG var. Sistemleri benzer tutmak kullanıcı eğitimlerinde ve alışkanlıklarında kolalıklar sağlayacaktır.
flatpak install -y flathub org.gnome.Totem 
flatpak install -y flathub org.gnome.eog
fi

apt-get -y remove thunderbird evolution evince
flatpak install -y flathub org.gnome.Geary
flatpak install -y flathub org.gnome.Evince

flatpak install -y flathub org.gnome.Lollypop

apt-get -y purge libreoffice*
flatpak install -y flathub org.libreoffice.LibreOffice

# apt-get -y remove firefox-esr				# Firefox silinince Chromium yükleniyor.
# flatpak install -y flathub org.mozilla.firefox

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


echo "# Yerel yazılımlar yükleniyor." ; sleep 2
dpkg -R --install ./Yazılımlar/
apt-get -fy install


echo "# Kalıntılar temizleniyor." ; sleep 2

apt-get -y autoremove
apt-get -y clean				

;;
"Oyuncu"*)  		# Oyuncu araçları Yüklemesi ===========================================================================


echo "# Oyuncu araçları yükleniyor." ; sleep 2

# flatpak install flathub com.valvesoftware.Steam  #Flatpak runtime sürümü depoda eski, bu eski sürümde de Nvidia-Steam sorunlu. O yüzden depoda Flatpak güncellenene kadar deb sürümü yükleyeceğiz. 

cd ./Oyuncu
wget https://steamcdn-a.akamaihd.net/client/installer/steam.deb 2>&1 | sed -u 's/.* \([0-9]\+%\)\ \+\([0-9.]\+.\) \(.*\)/\1\n# İndirme Hızı \2\/s, Kalan zaman \3/' | zenity --progress --title "İndirme İşlemi" --text "Steam indiriliyor..." --no-cancel --auto-close --pulsate
chmod 777 steam*.deb
cd ..
dpkg -R --install ./Oyuncu/
apt-get -fy install

#lutris --reinstall epic-games-store
#lutris --reinstall origin
#lutris --reinstall gog-galaxy
#lutris --reinstall rockstar-games-launcher

#lutris --reinstall battlenet
#apt-get install -y libgnutls30:i386 libldap-2.4-2:i386 libgpg-error0:i386 libsqlite3-0:i386




;;
"Wine"*)  		# Wine Yüklemesi ==========================================================================================


echo "# Wine yükleniyor ve yapılandırılıyor.\n \nİnternet hızınıza göre işlem uzayabilir.\n \nLütfen bekleyiniz..." ; sleep 2

apt-get -y install wine winetricks libgnutls30:i386 libldap-2.4-2:i386 libgpg-error0:i386 libxml2:i386 libasound2-plugins:i386 libsdl2-2.0-0:i386 libfreetype6:i386 libdbus-1-3:i386 libsqlite3-0:i386

winetricks -q directx9 dotnet40 corefonts ie8 vcrun2005 vcrun2008 vcrun2010 vcrun2015 vcrun2017 vcrun6sp6 dxvk

apt-get -y install libvulkan1 libvulkan1:i386 libvulkan-dev vulkan-utils mesa-vulkan-drivers libgl1:i386



;;
"Samba"*)  		# Samba Yüklemesi =========================================================================================


echo "# Samba kurulup kullanıma hazır hale gelmesi için ayarları yapılıyor." ; sleep 2

apt-get -y install samba smbclient winbind libpam-winbind libnss-winbind samba-vfs-modules samba-common libcups2 cups cifs-utils

if [[ $desktop = $gnome ]]; then
apt-get -y install nautilus-share
fi

groupadd smbgrp

usermod ${u} -aG smbgrp
mv /etc/samba/smb.conf /etc/samba/defsmb.conf
cp -r ./smb.conf /etc/samba/
find "/var/lib/samba/usershares" -type f -exec chmod 777 {} \+ # Samba izinleri. Şimdilik böyle. Alternatif çözüm üretilince değiştilecek.
chown -R $(id -un ${u}):$(id -gn ${u}) "/var/lib/samba/usershares"


systemctl restart smbd.service


;;
"Betikleri"*)  # Betikleri ve Şablonları Yükle ============================================================================================

echo "# Sağ Tık menüsü geliştiriliyor..." ; sleep 2

SAB="Şablonlar"
BET=".local/share/nautilus/scripts"               
_FILESB="./Betikler/*"	
_FILESS="./Şablonlar/*"  

  
  
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
       
       chown -R $(id -un $u):$(id -gn $u) "$_dir/${SAB}/."
       
   done
   
   if [[ $desktop = $gnome ]]; then
       
          for f in $_FILESB
   do
    

       cp -r "${f}" "$_dir/${BET}" #  Betikleri kopyala

       find "$_dir/${BET}/" -type f -exec chmod 777 {} \+ # Betik izinleri
       
       chown -R $(id -un $u):$(id -gn $u) "$_dir/${BET}/."
      

done
fi

  
;;
"XFCE"*)  # XFCE Ayarlarını yap =====================================================================================

killall xfconfd

_FILESX="./Xfce/.config/."  

  

   for f in $_FILESX
   do
    
       cp -r "${f}" "$_dir/${CONF}/" 

       find "$_dir/${CONF}/" -type f -exec chmod 777 {} \+
       
       chown -R $(id -un $u):$(id -gn $u) "$_dir/${CONF}/."
       
       find "$_dir/${CONF}/" -type f -exec chmod 777 {} \+
       
   done

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /panels/panel-1/plugin-ids --create -t int -s 2 -t int -s 12 -t int -s 14 -t int -s 11 -t int -s 16 -t int -s 17 -t int -s 3 -t int -s 7 -t int -s 15 -t int -s 1 -t int -s 5 -t int -s 8 -t int -s 4 -t int -s 13

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /panels/panel-1/size -t int -s 44

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /panels/panel-1/leave-opacity -t int --create -s 80

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /panels/panel-1/enter-opacity -t int --create -s 90

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /plugins/plugin-16/items --create -a -s 15909264344.desktop

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /plugins/plugin-16 --create -t string -s launcher

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /plugins/plugin-14/items --create -a -s 15909264293.desktop

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /plugins/plugin-14 --create -t string -s launcher

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /plugins/plugin-12/items --create -a -s 15909264112.desktop

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /plugins/plugin-12 --create -t string -s launcher

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /plugins/plugin-11/items --create -a -s 15909263981.desktop

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /plugins/plugin-11 --create -t string -s launcher

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfwm4 -p /general/theme -s Adapta-Blue

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfwm4 -p /general/frame_opacity --create -s 94

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfwm4 -p /general/inactive_opacity -- create -s 96

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfwm4 -p /general/title_font -s "Sans Bold 11"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xsettings -p /Net/ThemeName -s Adapta-Blue

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-desktop -p /desktop-icons/icon-size -s 48

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-desktop -p /desktop-icons/file-icons/show-removable -s false

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /plugins/plugin-15/size-max --create -s 30

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c xfce4-panel -p /plugins/plugin-15/show-frame --create -s true

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c thunar -p /last-icon-view-zoom-level -s THUNAR_ZOOM_LEVEL_150_PERCENT

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c thunar -p /misc-thumbnail-mode -s THUNAR_THUMBNAIL_MODE_ALWAYS

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c thunar -p /misc-date-style -s THUNAR_DATE_STYLE_SHORT

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c thunar -p /shortcuts-icon-size -s THUNAR_ICON_SIZE_32

#sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c thunar -p /misc-middle-click-in-tab -s TRUE

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c thunar -p /misc-recursive-permissions -s THUNAR_RECURSIVE_PERMISSIONS_NEVER

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" xfconf-query -c thunar -p /actions/action-3/command --create -s "exo-open --launch WebBrowser www.vuhuv.com.tr/%s"



;;
"Gnome"*)  # GNOME EKLENTİLERİNİ Yükle ==============================================================================

echo "# Gnome eklentileri yükleniyor." ; sleep 2

EXT_USERPATH="$_dir/.local/share/gnome-shell/extensions"
EXT_SYSPATH="/usr/local/share/gnome-shell/extensions"
GNOME_SITE="https://extensions.gnome.org/extension-data/"

# create temporary files
#TMP_ZIP=$(mktemp -t ext-XXXXXXXX.zip) && rm ${TMP_ZIP}

#wget --quiet --header='Accept-Encoding:none' -O "${TMP_ZIP}" "${GNOME_SITE}${EXTENSION_URL}"
#mkdir -p ${EXT_USERPATH}/${EXTENSION_UUID}
#unzip -oq "${TMP_ZIP}" -d ${EXTENSION_PATH}/${EXTENSION_UUID}
#chmod +r ${EXTENSION_PATH}/${EXTENSION_UUID}/*

#unzip -c <extension zip file name> metadata.json | grep uuid | cut -d \" -f4

GNM=".local/share/gnome-shell/extensions" 		
_FILESG="./Gnome/*"


   for f in $_FILESG
   do
    

       cp -r "${f}" "$_dir/${GNM}" 																# Dosyaları kopyala
 #     cp -r "${f}" "/usr/share/gnome-shell/extensions" 										# Dosyaları sistem dizinine kopyala

       find "$_dir/${GNM}/" -type f -exec chmod 777 {} \+ 										# Eklenti izinleri
 #     find "/usr/local/share/gnome-shell/extensions" -type f -exec chmod 777 {} \+ 			# Sistem eklenti izinleri
       
       chown -R $(id -un $u):$(id -gn $u) "$_dir/${GNM}/."

done


# Gnome Ayarları  # # # # # # # # # # # # # # # # # # # # # # #  # # # #


echo "# Sistem ince ayarları yapılıyor." ; sleep 2



sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e arc-menu@linxgem33.com

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/nautilus/preferences/executable-text-activation "'ask'"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/nautilus/preferences/show-create-link true

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/nautilus/icon-view/captions "['size', 'none', 'none']"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/desktop/background/show-desktop-icons true

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/desktop/sound/allow-volume-above-100-percent true

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/login-screen/disable-restart-buttons false

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/apt-update-indicator/autoremovable-packages false

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/apt-update-indicator/new-packages false

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/apt-update-indicator/obsolete-packages false

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/apt-update-indicator/residual-packages false

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/arc-menu/show-external-devices true

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/arc-menu/menu-button-icon "'Start_Box'"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/arc-menu/enable-sub-menus true

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/arc-menu/enable-pinned-apps false

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/desktop/wm/keybindings/panel-main-menu "['Super_R']"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/dash-to-panel/show-appmenu false

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/lockkeys/style "'show-hide'"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/lockkeys/notification-preferences "'on'"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/window-switcher/app-icon-mode "'both'"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e add-on-desktop@maestroschan.fr

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e appfolders-manager@maestroschan.fr

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e applications-overview-tooltip@RaphaelRochet

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e custom-hot-corners@janrunx.gmail.com

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d clipboard-indicator@tudmotu.com

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e ding@rastersoft.com

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d gnome-shell-screenshot@ttll.de

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e gsconnect@andyholmes.github.io

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e lockkeys@vaina.lt

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e noannoyance@daase.net

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e soft-brightness@fifi.org

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e update-extensions@franglais125.gmail.com

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e alternate-tab@gnome-shell-extensions.gcampax.github.com

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -e user-theme@gnome-shell-extensions.gcampax.github.com

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d apps-menu@gnome-shell-extensions.gcampax.github.com

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d drive-menu@gnome-shell-extensions.gcampax.github.com

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d places-menu@gnome-shell-extensions.gcampax.github.com

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gnome-shell-extension-tool -d window-list@gnome-shell-extensions.gcampax.github.com

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/nautilus/list-view/use-tree-view true
  
sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/mutter/overlay-key 'Super_L'
  
sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/arc-menu/application-shortcuts-list "[['Pardus Mağaza', '/usr/share/pardus/pardus-store/icon.svg', 'pardus-store.desktop'], ['Terminal', 'utilities-terminal-symbolic', 'gnome-terminal'], ['Activities Overview', 'view-fullscreen-symbolic', 'ArcMenu_ActivitiesOverview']]"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/arc-menu/directory-shortcuts-list "[['Bilgisayar', 'drive-harddisk-symbolic', 'ArcMenu_Computer'], ['Ev', 'user-home-symbolic', 'ArcMenu_Home'], ['Ağ', 'network-workgroup-symbolic', 'ArcMenu_Network']]"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/arc-menu/pinned-app-list "['Terminal', 'utilities-terminal', 'org.gnome.Terminal.desktop', 'Pardus Flatpak GUI', 'applications-system', 'tr.org.pardus.pardus_flatpak_gui.desktop', 'Pardus Mağaza', '/usr/share/pardus/pardus-store/icon.svg', 'pardus-store.desktop', 'Firefox', 'org.mozilla.firefox', 'org.mozilla.firefox.desktop', 'Geary', 'org.gnome.Geary', 'org.gnome.Geary.desktop', 'LibreOffice', 'org.libreoffice.LibreOffice.startcenter', 'org.libreoffice.LibreOffice.desktop']"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/nautilus/list-view/default-column-order "['name', 'size', 'type', 'owner', 'group', 'permissions', 'where', 'date_modified', 'date_modified_with_time', 'date_accessed', 'recency', 'starred', 'detailed_type']"
  
sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/desktop/privacy/remove-old-temp-files true

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/desktop/session/idle-delay uint32 "0"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/desktop/interface/gtk-theme "'Materia'"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" gsettings set org.gnome.shell.extensions.user-theme name "'Materia-dark'"

sudo -u ${u} DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${RUSER_UID}/bus" dconf write /org/gnome/shell/extensions/dash-to-panel/trans-panel-opacity "0.60"

rm -f -r /usr/local/share/gnome-shell/extensions/add-on-desktop@maestroschan.fr

rm -f -r ${UHOME}/${u}/.local/share/gnome-shell/extensions/add-on-desktop@maestroschan.fr

rm -f ${TMP_ZIP}



dconf update


;;
"Fontlar"*)  #  Temel Microsoft ücretsiz fontları yükleme =========================================================

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
	
	
	fc-cache			#Font öntbelleğini temizle

;;

"Grub"*)  # Grub2 Tema Yükleme  =====================================================================================

echo "# Yeni Grub teması yükleniyor. (İşletim Sistemi Seçenekleri menüsü)" ; sleep 2

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
done					#  Zenity checklist için çoklu seçim komutu kapat
done					#  Kullanıcı bazlı komutlar girişini kapat


# # # # # # # # # # # # # # # # # # # # # # #  # # # # # # # # # # # # # # # # # # # # # # # 


# İşlem tamamlanmıştır

notify-send -t 2000 -i /usr/share/icons/gnome/32x32/status/info.png "İşlem Tamamlanmıştır"


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



