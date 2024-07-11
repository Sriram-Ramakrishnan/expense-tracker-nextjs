'use server';
import { z } from 'zod'; 
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';


// Auth functions
 
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

// CRUD functions:
export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
      receiptId?: string[];
    };
    message?: string | null;
};

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
    receiptId: z.string(),
    date: z.string(),
  });

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });


export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
      receiptId: formData.get('receiptId')
    });

    console.log(validatedFields);

    if (!validatedFields.success) {
        return {
          errors: validatedFields.error.flatten().fieldErrors,
          message: 'Missing Fields. Failed to Create Invoice.'
        };
    }
    
    const { customerId, amount, status, receiptId } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    
    try {
      if(!receiptId) {
        await sql`INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    ON CONFLICT (id) DO NOTHING;`;
      } else{
        await sql`INSERT INTO invoices (customer_id, amount, status, receipt_id, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${receiptId}, ${date})
    ON CONFLICT (id) DO NOTHING;`;
      }
    } catch (error) {
      return {
        message: 'Database Error: Failed to Create Invoice.',
      };
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }

  export async function updateInvoice(
    id: string,
    prevState: State,
    formData: FormData,
  ) {
    const validatedFields = UpdateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
      receiptId: formData.get('receiptId')
    });

    console.log(validatedFields);
   
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Update Invoice.',
      };
    }
    
    console.log(validatedFields.data);
    const { customerId, amount, status, receiptId } = validatedFields.data;
    const amountInCents = amount * 100;
    console.log(receiptId);
    try {
      if(receiptId !== ''){
        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}, receipt_id = ${receiptId}
        WHERE id = ${id}
      `;
      }else{
        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}, receipt_id = NULL
        WHERE id = ${id}
      `;
      }
      console.log("updated");
    } catch (error) {
      return { message: 'Database Error: Failed to Update Invoice.' };
    }
   
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }

  export async function deleteInvoice(id: string) {
    try {
      await sql`DELETE FROM invoices WHERE id = ${id}`;
      revalidatePath('/dashboard/invoices');
      return { message: 'Deleted Invoice.' };
    } catch (error) {
      return { message: 'Database Error: Failed to Delete Invoice.' };
    }
  }
 
  export async function fetchImage( receiptId: string){
    try {
      console.log(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${receiptId}`);
      const response = await fetch(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${receiptId}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      return url;
    }
    catch(error){
      console.error('Error fetching image:', error);
    }
  }

  export async function fetchS3ImgUrl( receiptId: string){
    try {
      return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${receiptId}`;
    }
    catch(error){
      console.error('Error fetching image:', error);
    }
  }