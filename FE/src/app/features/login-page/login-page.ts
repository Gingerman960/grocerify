import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
    selector: 'app-grocery-list-page',
    imports: [
        CdkDropList,
        CdkDrag,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './login-page.html',
    styleUrl: './login-page.scss',
})
export class LoginPage {

    public onLogin(): void {
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = '/list';
    }

}
