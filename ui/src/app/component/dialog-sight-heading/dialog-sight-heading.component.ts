import { Component, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dialog-sight-heading',
  templateUrl: './dialog-sight-heading.component.html',
  styleUrl: './dialog-sight-heading.component.scss'
})
export class DialogSightHeadingComponent {

  constructor(public dialogRef: MatDialogRef<DialogSightHeadingComponent, number>) { }

  closeDialog() {
    this.dialogRef.close(undefined);
  }
  
  headingSelected(offset: number):void{
    this.dialogRef.close(offset);
  }

}



@Injectable({
  providedIn: 'root'
})
export class DialogSightHeadingLauncher {

  constructor(
    private dialog: MatDialog,
  ) { }


  async launch(): Promise<number> {
    return await firstValueFrom(this.dialog.open<any, any, number>(DialogSightHeadingComponent, { maxHeight: "90dvh", maxWidth: "90dvw" })
      .afterClosed())
  }

}
