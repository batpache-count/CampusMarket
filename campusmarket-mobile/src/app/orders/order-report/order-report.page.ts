import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { ToastController, NavController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-order-report',
    templateUrl: './order-report.page.html',
    styleUrls: ['./order-report.page.scss'],
    standalone: false,
})
export class OrderReportPage implements OnInit {
    orderId: string | null = null;
    order: any = null;
    items: any[] = [];
    loading = true;
    selectedReason: string = '';
    comments: string = '';
    isSeller = false;

    reasons: any[] = [];

    constructor(
        private route: ActivatedRoute,
        private orderService: OrderService,
        private toastController: ToastController,
        private navCtrl: NavController,
        private authService: AuthService
    ) { }

    ngOnInit() {
        this.orderId = this.route.snapshot.paramMap.get('id');
        if (this.orderId) {
            this.loadOrder();
        }
    }

    loadOrder() {
        this.loading = true;
        this.orderService.getOrderDetails(Number(this.orderId)).subscribe({
            next: (data) => {
                this.order = data.order;
                this.items = data.items || [];
                this.checkRole();
                this.initReasons();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading order for report:', err);
                this.loading = false;
            }
        });
    }

    checkRole() {
        const user = this.authService.getCurrentUser();
        if (user && this.order) {
            this.isSeller = (Number(user.id) === Number(this.order.ID_Vendedor_User));
        }
    }

    initReasons() {
        const buyerReasons = [
            { label: 'El producto no coincide con la descripción', value: 'Producto diferente' },
            { label: 'El vendedor no se presentó', value: 'Vendedor ausente' },
            { label: 'Cobro excesivo / Solicitó más dinero', value: 'Sobreprecio' },
            { label: 'Comportamiento inapropiado', value: 'Mala conducta' },
            { label: 'Otro', value: 'Otro' }
        ];

        const sellerReasons = [
            { label: 'El comprador no se presentó', value: 'Comprador ausente' },
            { label: 'El comprador no realizó el pago', value: 'Falta de pago' },
            { label: 'Comportamiento inapropiado', value: 'Mala conducta' },
            { label: 'Otro', value: 'Otro' }
        ];

        this.reasons = this.isSeller ? sellerReasons : buyerReasons;
    }

    onReasonChange() {
        // Logic if needed when reason changes
    }

    isSubmitDisabled() {
        if (!this.selectedReason) return true;
        if (this.selectedReason === 'Otro' && !this.comments.trim()) return true;
        return false;
    }

    async submitReport() {
        if (this.isSubmitDisabled()) return;

        this.loading = true;
        this.orderService.createReport(this.orderId!, {
            Motivo: this.selectedReason,
            Detalles: this.comments
        }).subscribe({
            next: async (res) => {
                this.loading = false;
                const toast = await this.toastController.create({
                    message: 'Reporte enviado con éxito. Un administrador lo revisará.',
                    duration: 3000,
                    color: 'success',
                    position: 'bottom'
                });
                await toast.present();
                this.navCtrl.back();
            },
            error: async (err) => {
                this.loading = false;
                const toast = await this.toastController.create({
                    message: 'Error al enviar reporte.',
                    duration: 2000,
                    color: 'danger',
                    position: 'bottom'
                });
                await toast.present();
            }
        });
    }
}
